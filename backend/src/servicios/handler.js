'use strict';

const { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const dynamo = require('../lib/dynamo');
const r = require('../lib/response');

const TABLE = process.env.TABLE_SERVICIOS;

// GET /servicios
module.exports.list = async () => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));
    return r.ok(result.Items || []);
  } catch (err) {
    return r.serverError(err);
  }
};

// POST /servicios
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { rol, costo_mensual_actual, costo_mensual_subida, notas } = body;

    if (!rol || costo_mensual_actual === undefined) {
      return r.badRequest('Campos requeridos: rol, costo_mensual_actual');
    }

    const item = {
      id: randomUUID(),
      rol,
      costo_mensual_actual: Number(costo_mensual_actual),
      costo_mensual_subida: costo_mensual_subida !== undefined
        ? Number(costo_mensual_subida)
        : Number(costo_mensual_actual),
      notas: notas || '',
      creado_en: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return r.created(item);
  } catch (err) {
    return r.serverError(err);
  }
};

// PUT /servicios/{id}
module.exports.update = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body   = JSON.parse(event.body || '{}');
    const updates = [];
    const names   = {};
    const values  = {};

    const numericos = ['costo_mensual_actual', 'costo_mensual_subida'];
    const todos     = ['rol', ...numericos, 'notas'];

    todos.forEach((field) => {
      if (body[field] !== undefined) {
        updates.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = numericos.includes(field) ? Number(body[field]) : body[field];
      }
    });

    if (updates.length === 0) return r.badRequest('Sin campos para actualizar');

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id },
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

// DELETE /servicios/{id}
module.exports.remove = async (event) => {
  try {
    const { id } = event.pathParameters;
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
    return r.noContent();
  } catch (err) {
    return r.serverError(err);
  }
};
