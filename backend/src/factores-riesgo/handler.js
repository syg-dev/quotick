'use strict';

const { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const dynamo = require('../lib/dynamo');
const r = require('../lib/response');

const TABLE = process.env.TABLE_FACTORES_RIESGO;

// GET /factores-riesgo
module.exports.list = async () => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));
    return r.ok(result.Items || []);
  } catch (err) {
    return r.serverError(err);
  }
};

// POST /factores-riesgo
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { factor, puntos, descripcion } = body;

    if (!factor || puntos === undefined) {
      return r.badRequest('Campos requeridos: factor, puntos');
    }

    const item = {
      id: randomUUID(),
      factor,
      puntos: Number(puntos),
      descripcion: descripcion || '',
      creado_en: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return r.created(item);
  } catch (err) {
    return r.serverError(err);
  }
};

// PUT /factores-riesgo/{id}
module.exports.update = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body   = JSON.parse(event.body || '{}');
    const updates = [];
    const names   = {};
    const values  = {};

    const todos = ['factor', 'puntos', 'descripcion'];
    todos.forEach((field) => {
      if (body[field] !== undefined) {
        updates.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = field === 'puntos' ? Number(body[field]) : body[field];
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

// DELETE /factores-riesgo/{id}
module.exports.remove = async (event) => {
  try {
    const { id } = event.pathParameters;
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
    return r.noContent();
  } catch (err) {
    return r.serverError(err);
  }
};
