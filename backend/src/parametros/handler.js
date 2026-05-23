'use strict';

const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const dynamo = require('../lib/dynamo');
const r = require('../lib/response');

const TABLE    = process.env.TABLE_PARAMETROS;
const CONFIG_ID = 'config-global';

// GET /parametros
module.exports.get = async () => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { id: CONFIG_ID },
    }));

    if (!result.Item) {
      return r.ok({
        id: CONFIG_ID,
        trm: 4200,
        dias_mes: 20,
        horas_dia: 8,
        utilizacion: 0.80,
        gm_umbrales: { bajo: 1, medio: 3 },
        vigente_desde: null,
        _defaults: true,
      });
    }
    return r.ok(result.Item);
  } catch (err) {
    return r.serverError(err);
  }
};

// POST /parametros
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { trm, dias_mes, horas_dia, utilizacion, gm_umbrales } = body;

    if (!trm || !dias_mes || !horas_dia || !utilizacion) {
      return r.badRequest('Campos requeridos: trm, dias_mes, horas_dia, utilizacion');
    }

    const item = {
      id: CONFIG_ID,
      trm: Number(trm),
      dias_mes: Number(dias_mes),
      horas_dia: Number(horas_dia),
      utilizacion: Number(utilizacion),
      gm_umbrales: gm_umbrales || { bajo: 1, medio: 3 },
      vigente_desde: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return r.created(item);
  } catch (err) {
    return r.serverError(err);
  }
};

// PUT /parametros/{id}
module.exports.update = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const updates = [];
    const names   = {};
    const values  = {};

    const numericos = ['trm', 'dias_mes', 'horas_dia', 'utilizacion'];
    const todos     = [...numericos, 'gm_umbrales'];

    todos.forEach((field) => {
      if (body[field] !== undefined) {
        updates.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = numericos.includes(field) ? Number(body[field]) : body[field];
      }
    });

    if (updates.length === 0) return r.badRequest('Sin campos para actualizar');

    updates.push('#vigente_desde = :vigente_desde');
    names['#vigente_desde']  = 'vigente_desde';
    values[':vigente_desde'] = new Date().toISOString();

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: CONFIG_ID },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    return r.ok(result.Attributes);
  } catch (err) {
    return r.serverError(err);
  }
};
