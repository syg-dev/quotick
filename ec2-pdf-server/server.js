'use strict';

const http       = require('http');
const puppeteer  = require('puppeteer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { buildHtml } = require('./template');

const PORT   = 3001;
const BUCKET = 'quotick-frontend-prod';
const REGION = 'us-east-1';

const s3 = new S3Client({ region: REGION });

async function generatePdf(cotizacion) {
  const html = buildHtml(cotizacion);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  await browser.close();
  return pdfBuffer;
}

async function uploadToS3(pdfBuffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key:    key,
    Body:   pdfBuffer,
    ContentType: 'application/pdf',
  }));

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
  return url;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/generar-pdf') {
    try {
      const cotizacion = await parseBody(req);
      const key = `pdfs/COT-${(cotizacion.id || 'unknown').slice(0, 8).toUpperCase()}-${Date.now()}.pdf`;

      console.log(`[PDF] Generando para cotización ${cotizacion.id}`);
      const pdfBuffer = await generatePdf(cotizacion);

      console.log(`[PDF] Subiendo a S3: ${key}`);
      const signedUrl = await uploadToS3(pdfBuffer, key);

      res.writeHead(200);
      res.end(JSON.stringify({ url: signedUrl }));
      console.log(`[PDF] Listo: ${key}`);
    } catch (err) {
      console.error('[PDF] Error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[PDF Server] Corriendo en http://0.0.0.0:${PORT}`);
});
