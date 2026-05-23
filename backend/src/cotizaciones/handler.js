'use strict';

const {
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  BatchGetCommand,
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const dynamo = require('../lib/dynamo');
const r = require('../lib/response');

const T_COTIZACIONES   = process.env.TABLE_COTIZACIONES;
const T_PARAMETROS     = process.env.TABLE_PARAMETROS;
const T_SERVICIOS      = process.env.TABLE_SERVICIOS;
const T_HERRAMIENTAS   = process.env.TABLE_HERRAMIENTAS;
const T_FACTORES_RIESGO = process.env.TABLE_FACTORES_RIESGO;

const ESTADOS_VALIDOS = ['borrador', 'enviada', 'aprobada', 'rechazada'];

// ─── helpers ────────────────────────────────────────────────────────────────

async function getParametros() {
  const res = await dynamo.send(new GetCommand({
    TableName: T_PARAMETROS,
    Key: { id: 'config-global' },
  }));
  return res.Item || {
    trm: 4200,
    dias_mes: 20,
    horas_dia: 8,
    utilizacion: 0.80,
    gm_umbrales: { bajo: 1, medio: 3 },
  };
}

async function batchGet(tableName, ids) {
  if (!ids || ids.length === 0) return {};
  const uniqueIds = [...new Set(ids)];
  const res = await dynamo.send(new BatchGetCommand({
    RequestItems: {
      [tableName]: { Keys: uniqueIds.map((id) => ({ id })) },
    },
  }));
  const map = {};
  (res.Responses[tableName] || []).forEach((item) => { map[item.id] = item; });
  return map;
}

// ─── calculo principal ────────────────────────────────────────────────────────
// Body esperado:
// {
//   cliente_id, nombre_proyecto, escenario ("actual"|"con_subida"),
//   items: [{ rol_id, headcount, horas }],
//   herramientas_ids: ["uuid", ...],          // opcional
//   factores: [{ id, aplica: true|false }],   // opcional
//   infra_mes: 0                              // opcional
// }

async function calcular({ escenario, items, herramientas_ids, factores, infra_mes }) {
  const params = await getParametros();
  const horas_productivas_mes = Math.round(
    params.dias_mes * params.horas_dia * params.utilizacion
  );

  // Roles
  const rolIds     = items.map((i) => i.rol_id);
  const serviciosMap = await batchGet(T_SERVICIOS, rolIds);

  let total_horas     = 0;
  let total_headcount = 0;

  const itemsCalc = items.map((item) => {
    const svc = serviciosMap[item.rol_id];
    if (!svc) throw new Error(`Rol no encontrado: ${item.rol_id}`);

    const costo_mensual = escenario === 'con_subida'
      ? svc.costo_mensual_subida
      : svc.costo_mensual_actual;

    const costo_hora = costo_mensual / horas_productivas_mes;
    const costo_item = item.horas * costo_hora;

    total_horas     += item.horas;
    total_headcount += item.headcount;

    return {
      rol_id: item.rol_id,
      rol: svc.rol,
      headcount: item.headcount,
      horas: item.horas,
      costo_hora: Math.round(costo_hora),
      costo_item: Math.round(costo_item),
    };
  });

  const costo_MO      = itemsCalc.reduce((s, i) => s + i.costo_item, 0);
  const capacidad_mes = total_headcount * horas_productivas_mes;
  const duracion_meses = capacidad_mes > 0
    ? parseFloat((total_horas / capacidad_mes).toFixed(2))
    : 1;

  // Herramientas
  let costo_herramientas = 0;
  let herramientasCalc   = [];

  if (herramientas_ids && herramientas_ids.length > 0) {
    const hMap = await batchGet(T_HERRAMIENTAS, herramientas_ids);
    herramientasCalc = herramientas_ids
      .map((id) => {
        const h = hMap[id];
        if (!h) return null;
        const cop_mes = Math.round(h.usd_seat * h.cantidad * params.trm);
        return { id, nombre: h.nombre, usd_seat: h.usd_seat, cantidad: h.cantidad, cop_mes };
      })
      .filter(Boolean);
    const total_herramientas_mes = herramientasCalc.reduce((s, h) => s + h.cop_mes, 0);
    costo_herramientas = Math.round(total_herramientas_mes * duracion_meses);
  }

  // Infraestructura
  const costo_infra = Math.round((infra_mes || 0) * duracion_meses);

  // Costo total
  const costo_total = costo_MO + costo_herramientas + costo_infra;

  // Factores de riesgo → GM
  let factoresCalc = [];
  let puntaje      = 0;

  if (factores && factores.length > 0) {
    const factorIds  = factores.map((f) => f.id);
    const factoresMap = await batchGet(T_FACTORES_RIESGO, factorIds);

    factoresCalc = factores.map((f) => {
      const fd = factoresMap[f.id] || {};
      if (f.aplica) puntaje += fd.puntos || 0;
      return {
        id: f.id,
        factor: fd.factor || '',
        puntos: fd.puntos || 0,
        aplica: f.aplica,
      };
    });
  }

  const um = params.gm_umbrales || { bajo: 1, medio: 3 };
  const gm = puntaje <= um.bajo ? 0.40 : puntaje <= um.medio ? 0.50 : 0.60;

  // Precio final
  const precio_fijo    = Math.round(costo_total / (1 - gm));
  const utilidad       = precio_fijo - costo_total;
  const precio_mensual = duracion_meses > 0 ? Math.round(precio_fijo / duracion_meses) : 0;
  const precio_diario  = Math.round(precio_mensual / params.dias_mes);
  const precio_hora    = Math.round(precio_mensual / (params.dias_mes * params.horas_dia));

  return {
    parametros_snapshot: {
      trm: params.trm,
      dias_mes: params.dias_mes,
      horas_dia: params.horas_dia,
      utilizacion: params.utilizacion,
      horas_productivas_mes,
    },
    items: itemsCalc,
    herramientas: herramientasCalc,
    factores_riesgo: factoresCalc,
    puntaje_riesgo: puntaje,
    gm,
    costo_MO,
    costo_herramientas,
    costo_infra,
    costo_total,
    duracion_meses,
    precio_fijo,
    utilidad,
    precio_mensual,
    precio_diario,
    precio_hora,
  };
}

// ─── handlers ────────────────────────────────────────────────────────────────

// GET /cotizaciones
module.exports.list = async () => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: T_COTIZACIONES }));
    const items  = (result.Items || []).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return r.ok(items);
  } catch (err) {
    return r.serverError(err);
  }
};

// POST /cotizaciones
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { cliente_id, nombre_proyecto, escenario, items, herramientas_ids, factores, infra_mes } = body;

    if (!cliente_id || !nombre_proyecto || !escenario || !items || items.length === 0) {
      return r.badRequest('Campos requeridos: cliente_id, nombre_proyecto, escenario, items');
    }
    if (!['actual', 'con_subida'].includes(escenario)) {
      return r.badRequest('escenario debe ser "actual" o "con_subida"');
    }

    const calculo = await calcular({ escenario, items, herramientas_ids, factores, infra_mes });

    const cotizacion = {
      id: randomUUID(),
      cliente_id,
      nombre_proyecto,
      fecha: new Date().toISOString(),
      escenario,
      estado: 'borrador',
      ...calculo,
    };

    await dynamo.send(new PutCommand({ TableName: T_COTIZACIONES, Item: cotizacion }));
    return r.created(cotizacion);
  } catch (err) {
    if (err.message && err.message.startsWith('Rol no encontrado')) {
      return r.badRequest(err.message);
    }
    return r.serverError(err);
  }
};

// GET /cotizaciones/{id}
module.exports.get = async (event) => {
  try {
    const { id } = event.pathParameters;
    const result = await dynamo.send(new GetCommand({ TableName: T_COTIZACIONES, Key: { id } }));
    if (!result.Item) return r.notFound('Cotizacion no encontrada');
    return r.ok(result.Item);
  } catch (err) {
    return r.serverError(err);
  }
};

// PATCH /cotizaciones/{id}/estado
module.exports.updateEstado = async (event) => {
  try {
    const { id }   = event.pathParameters;
    const { estado } = JSON.parse(event.body || '{}');

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return r.badRequest(`estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`);
    }

    const result = await dynamo.send(new UpdateCommand({
      TableName: T_COTIZACIONES,
      Key: { id },
      UpdateExpression: 'SET #estado = :estado, #actualizado_en = :ts',
      ExpressionAttributeNames: {
        '#estado': 'estado',
        '#actualizado_en': 'actualizado_en',
      },
      ExpressionAttributeValues: {
        ':estado': estado,
        ':ts': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    return r.ok(result.Attributes);
  } catch (err) {
    return r.serverError(err);
  }
};
