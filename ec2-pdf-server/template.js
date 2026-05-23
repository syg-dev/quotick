'use strict';

function fmt(n) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildHtml(cot) {
  const rolesRows = (cot.items_snapshot || []).map(item => `
    <tr>
      <td>${item.rol}</td>
      <td class="center">${item.headcount}</td>
      <td class="center">${item.horas}</td>
    </tr>`).join('');

  const herramientasRows = (cot.herramientas_snapshot || []).map(h => `
    <tr>
      <td>${h.nombre}</td>
      <td class="center">${h.cantidad} seat${h.cantidad > 1 ? 's' : ''}</td>
    </tr>`).join('');

  const factoresRows = (cot.factores_snapshot || [])
    .filter(f => f.aplica)
    .map(f => `<li>${f.factor}</li>`)
    .join('');

  const hasHerramientas = (cot.herramientas_snapshot || []).length > 0;
  const hasFactores     = (cot.factores_snapshot || []).filter(f => f.aplica).length > 0;

  const quoteNum = (cot.id || '').slice(0, 8).toUpperCase();
  const fecha    = fmtDate(cot.fecha || new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }

  /* HEADER */
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
            color: #fff; padding: 36px 48px 28px; display: flex;
            justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #FF9900; }
  .brand span { color: #fff; font-weight: 300; }
  .tagline { font-size: 11px; color: #aab4c8; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .quote-meta { text-align: right; }
  .quote-num { font-size: 22px; font-weight: 700; color: #FF9900; }
  .quote-date { font-size: 11px; color: #aab4c8; margin-top: 4px; }

  /* HERO — precio destacado */
  .hero { background: #f8f9ff; border-left: 5px solid #FF9900;
          margin: 0; padding: 28px 48px; display: flex;
          justify-content: space-between; align-items: center; }
  .project-info h2 { font-size: 20px; font-weight: 700; color: #0f3460; }
  .project-info .client { font-size: 13px; color: #555; margin-top: 4px; }
  .project-info .client strong { color: #1a1a2e; }
  .price-box { text-align: right; }
  .price-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
                 color: #888; font-weight: 600; }
  .price-value { font-size: 36px; font-weight: 800; color: #FF9900; line-height: 1.1; }
  .price-note  { font-size: 10px; color: #888; margin-top: 4px; }

  /* CUERPO */
  .body { padding: 28px 48px; }

  /* SECCIÓN */
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 1.5px; color: #0f3460; border-bottom: 2px solid #e8ecf4;
                   padding-bottom: 6px; margin-bottom: 12px; }

  /* TABLA */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f3460; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 11px; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f2f8; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f8f9ff; }
  .center { text-align: center; }

  /* RESUMEN FINANCIERO */
  .financial { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .fin-card { background: #f8f9ff; border-radius: 8px; padding: 16px 20px; border: 1px solid #e8ecf4; }
  .fin-card.highlight { background: #fff8e8; border-color: #FF9900; }
  .fin-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600; }
  .fin-value { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 4px; }
  .fin-card.highlight .fin-value { color: #FF9900; font-size: 22px; }

  /* DESGLOSE TEMPORAL */
  .time-row { display: flex; gap: 12px; margin-top: 12px; }
  .time-card { flex: 1; background: #f8f9ff; border-radius: 6px; padding: 12px 16px;
               border: 1px solid #e8ecf4; text-align: center; }
  .time-card .t-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .time-card .t-value { font-size: 15px; font-weight: 700; color: #0f3460; margin-top: 4px; }

  /* CONDICIONES */
  .conditions { background: #f8f9ff; border-radius: 8px; padding: 16px 20px;
                border: 1px solid #e8ecf4; font-size: 11px; color: #555; line-height: 1.8; }
  .conditions ul { padding-left: 16px; }
  .conditions li { margin-bottom: 2px; }

  /* FOOTER */
  .footer { background: #1a1a2e; color: #aab4c8; padding: 16px 48px;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 10px; margin-top: 8px; }
  .footer .validity { color: #FF9900; font-weight: 600; }

  /* RIESGOS */
  .risk-list { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
  .risk-list li { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;
                  padding: 3px 10px; font-size: 11px; color: #856404; }
</style>
</head>
<body>

<!-- ENCABEZADO -->
<div class="header">
  <div>
    <div class="brand">Quotick<span> by SYG</span></div>
    <div class="tagline">Propuesta comercial de desarrollo de software</div>
  </div>
  <div class="quote-meta">
    <div class="quote-num">COT-${quoteNum}</div>
    <div class="quote-date">${fecha}</div>
  </div>
</div>

<!-- HERO -->
<div class="hero">
  <div class="project-info">
    <h2>${cot.nombre_proyecto || 'Proyecto de software'}</h2>
    <div class="client">Preparado para: <strong>${cot.cliente_nombre || ''} · ${cot.cliente_empresa || ''}</strong></div>
    <div class="client" style="margin-top:6px">Duración estimada: <strong>${cot.duracion_meses} meses</strong> &nbsp;·&nbsp; Escenario: <strong>${cot.escenario === 'con_subida' ? 'Con ajuste salarial' : 'Tarifas vigentes'}</strong></div>
  </div>
  <div class="price-box">
    <div class="price-label">Inversión total</div>
    <div class="price-value">${fmt(cot.precio_fijo)}</div>
    <div class="price-note">Precio fijo · IVA no incluido</div>
  </div>
</div>

<div class="body">

  <!-- RESUMEN FINANCIERO -->
  <div class="section">
    <div class="section-title">Resumen de la inversión</div>
    <div class="financial">
      <div class="fin-card">
        <div class="fin-label">Costo del proyecto</div>
        <div class="fin-value">${fmt(cot.costo_total)}</div>
      </div>
      <div class="fin-card highlight">
        <div class="fin-label">Precio de venta</div>
        <div class="fin-value">${fmt(cot.precio_fijo)}</div>
      </div>
    </div>
    <div class="time-row">
      <div class="time-card">
        <div class="t-label">Por mes</div>
        <div class="t-value">${fmt(cot.precio_mensual)}</div>
      </div>
      <div class="time-card">
        <div class="t-label">Por día</div>
        <div class="t-value">${fmt(cot.precio_diario)}</div>
      </div>
      <div class="time-card">
        <div class="t-label">Por hora</div>
        <div class="t-value">${fmt(cot.precio_hora)}</div>
      </div>
    </div>
  </div>

  <!-- EQUIPO -->
  <div class="section">
    <div class="section-title">Equipo del proyecto</div>
    <table>
      <thead><tr><th>Perfil</th><th class="center">Personas</th><th class="center">Horas totales</th></tr></thead>
      <tbody>${rolesRows}</tbody>
    </table>
  </div>

  ${hasHerramientas ? `
  <!-- HERRAMIENTAS -->
  <div class="section">
    <div class="section-title">Herramientas y licencias incluidas</div>
    <table>
      <thead><tr><th>Herramienta</th><th class="center">Licencias</th></tr></thead>
      <tbody>${herramientasRows}</tbody>
    </table>
  </div>` : ''}

  ${hasFactores ? `
  <!-- CONSIDERACIONES -->
  <div class="section">
    <div class="section-title">Consideraciones del proyecto</div>
    <div class="conditions">
      <ul class="risk-list">${factoresRows}</ul>
    </div>
  </div>` : ''}

  <!-- CONDICIONES COMERCIALES -->
  <div class="section">
    <div class="section-title">Condiciones comerciales</div>
    <div class="conditions">
      <ul>
        <li>Esta cotización tiene una vigencia de <strong>30 días</strong> a partir de la fecha de emisión.</li>
        <li>El precio fijo aplica para el alcance definido. Cambios de alcance requieren una adenda.</li>
        <li>Los pagos se estructuran por hitos acordados al inicio del proyecto.</li>
        <li>Los valores están expresados en pesos colombianos (COP). IVA no incluido.</li>
      </ul>
    </div>
  </div>

</div>

<!-- FOOTER -->
<div class="footer">
  <div>Quotick · Cotizador de Software · <span class="validity">Válida hasta 30 días desde la emisión</span></div>
  <div>COT-${quoteNum} · ${fecha}</div>
</div>

</body>
</html>`;
}

module.exports = { buildHtml };
