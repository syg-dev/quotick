'use strict';

const { ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const dynamo = require('../lib/dynamo');
const r = require('../lib/response');

const TABLE = process.env.TABLE_CLIENTES;

// GET /clientes
module.exports.list = async () => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));
    return r.ok(result.Items || []);
  } catch (err) {
    return r.serverError(err);
  }
};

// POST /clientes
module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { nombre, empresa, email, contacto } = body;

    if (!nombre || !empresa) {
      return r.badRequest('Campos requeridos: nombre, empresa');
    }

    const item = {
      id: randomUUID(),
      nombre,
      empresa,
      email: email || '',
      contacto: contacto || '',
      creado_en: new Date().toISOString(),
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    return r.created(item);
  } catch (err) {
    return r.serverError(err);
  }
};

// GET /clientes/{id}
module.exports.get = async (event) => {
  try {
    const { id } = event.pathParameters;
    const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { id } }));
    if (!result.Item) return r.notFound('Cliente no encontrado');
    return r.ok(result.Item);
  } catch (err) {
    return r.serverError(err);
  }
};

// PUT /clientes/{id}
module.exports.update = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body   = JSON.parse(event.body || '{}');
    const updates = [];
    const names   = {};
    const values  = {};

    ['nombre', 'empresa', 'email', 'contacto'].forEach((field) => {
      if (body[field] !== undefined) {
        updates.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = body[field];
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

// DELETE /clientes/{id}
module.exports.remove = async (event) => {
  try {
    const { id } = event.pathParameters;
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
    return r.noContent();
  } catch (err) {
    return r.serverError(err);
  }
};
