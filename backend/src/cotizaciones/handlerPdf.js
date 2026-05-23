'use strict';

const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const dynamo = require('../lib/dynamo');
const { ok, notFound, serverError } = require('../lib/response');

const TABLE = process.env.TABLE_COTIZACIONES;
const EC2_PDF_URL = process.env.EC2_PDF_URL;

module.exports.generatePdf = async (event) => {
  const { id } = event.pathParameters || {};
  if (!id) return notFound('ID requerido');

  try {
    // Leer cotización completa de DynamoDB
    const result = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { id } }));
    if (!result.Item) return notFound('Cotización no encontrada');

    const cot = result.Item;

    // Llamar al servidor PDF en EC2
    const response = await fetch(`${EC2_PDF_URL}/generar-pdf`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(cot),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error en servidor PDF' }));
      throw new Error(err.error || 'Error generando PDF');
    }

    const { url } = await response.json();
    return ok({ url });

  } catch (err) {
    return serverError(err);
  }
};
