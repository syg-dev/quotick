'use strict';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const ok        = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const created   = (body) => ({ statusCode: 201, headers: CORS, body: JSON.stringify(body) });
const noContent = ()     => ({ statusCode: 204, headers: CORS, body: '' });
const notFound  = (msg = 'No encontrado') =>
  ({ statusCode: 404, headers: CORS, body: JSON.stringify({ error: msg }) });
const badRequest = (msg = 'Solicitud invalida') =>
  ({ statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) });
const serverError = (err) => {
  console.error(err);
  return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Error interno del servidor' }) };
};

module.exports = { ok, created, noContent, notFound, badRequest, serverError };
