import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

const empty = () => ({ _k: Date.now(), rol_id: '', headcount: 1, horas: 0 });

export default function NuevaCotizacion() {
  const [clientes,    setClientes]    = useState([]);
  const [servicios,   setServicios]   = useState([]);
  const [herramientas, setHerramientas] = useState([]);
  const [factores,    setFactores]    = useState([]);

  const [form, setForm] = useState({
    cliente_id: '', nombre_proyecto: '', escenario: 'actual', infra_mes: 0,
  });
  const [items,      setItems]      = useState([empty()]);
  const [toolSel,    setToolSel]    = useState({});   // id → boolean
  const [factorSel,  setFactorSel]  = useState({});  // id → boolean

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api.get('/clientes').then(setClientes).catch(() => {});
    api.get('/servicios').then(setServicios).catch(() => {});
    api.get('/herramientas').then(setHerramientas).catch(() => {});
    api.get('/factores-riesgo').then(setFactores).catch(() => {});
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem  = (k, i, v) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResultado(null);
    if (!form.cliente_id || !form.nombre_proyecto) return setError('Cliente y nombre del proyecto son obligatorios');
    if (items.some(it => !it.rol_id || it.horas <= 0)) return setError('Cada rol debe tener un rol seleccionado y horas > 0');

    setLoading(true);
    try {
      const body = {
        ...form,
        infra_mes: Number(form.infra_mes) || 0,
        items: items.map(({ rol_id, headcount, horas }) => ({ rol_id, headcount: Number(headcount), horas: Number(horas) })),
        herramientas_ids: Object.keys(toolSel).filter(id => toolSel[id]),
        factores: factores.map(f => ({ id: f.id, aplica: !!factorSel[f.id] })),
      };
      const res = await api.post('/cotizaciones', body);
      setResultado(res);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-title">Nueva Cotización</div>
      <form onSubmit={submit}>
        {error && <div className="error-msg">{error}</div>}

        {/* Cliente y proyecto */}
        <div className="card">
          <div className="card-title">Datos del proyecto</div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label>Cliente</label>
              <select value={form.cliente_id} onChange={e => setField('cliente_id', e.target.value)} required>
                <option value="">— Seleccionar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.empresa}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre del proyecto</label>
              <input value={form.nombre_proyecto} onChange={e => setField('nombre_proyecto', e.target.value)} required placeholder="Ej: Portal de pagos" />
            </div>
          </div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label>Escenario de tarifas</label>
              <select value={form.escenario} onChange={e => setField('escenario', e.target.value)}>
                <option value="actual">Tarifas actuales</option>
                <option value="con_subida">Con subida salarial</option>
              </select>
            </div>
            <div className="form-group">
              <label>Infraestructura mensual (COP)</label>
              <input type="number" min="0" value={form.infra_mes} onChange={e => setField('infra_mes', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Roles del equipo</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setItems(a => [...a, empty()])}>+ Agregar rol</button>
          </div>
          <table className="items-table">
            <thead><tr><th>Rol</th><th>Headcount</th><th>Horas totales</th><th></th></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it._k}>
                  <td>
                    <select value={it.rol_id} onChange={e => setItem('rol_id', i, e.target.value)} required>
                      <option value="">— Seleccionar —</option>
                      {servicios.map(s => <option key={s.id} value={s.id}>{s.rol}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="1" value={it.headcount} onChange={e => setItem('headcount', i, e.target.value)} style={{ width: 70 }} /></td>
                  <td><input type="number" min="1" value={it.horas} onChange={e => setItem('horas', i, e.target.value)} style={{ width: 90 }} /></td>
                  <td>
                    {items.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setItems(a => a.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Herramientas */}
        {herramientas.length > 0 && (
          <div className="card">
            <div className="card-title">Herramientas / Licencias</div>
            <div className="check-list">
              {herramientas.map(h => (
                <label key={h.id} className="check-item">
                  <input type="checkbox" checked={!!toolSel[h.id]} onChange={e => setToolSel(s => ({ ...s, [h.id]: e.target.checked }))} />
                  <div className="info">
                    <div className="name">{h.nombre}</div>
                    <div className="desc">USD {h.usd_seat}/seat × {h.cantidad} seat{h.cantidad > 1 ? 's' : ''}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Factores de riesgo */}
        {factores.length > 0 && (
          <div className="card">
            <div className="card-title">Factores de riesgo</div>
            <div className="check-list">
              {factores.map(f => (
                <label key={f.id} className="check-item">
                  <input type="checkbox" checked={!!factorSel[f.id]} onChange={e => setFactorSel(s => ({ ...s, [f.id]: e.target.checked }))} />
                  <div className="info">
                    <div className="name">{f.factor} <span style={{ color: '#888', fontWeight: 400 }}>({f.puntos} pt{f.puntos !== 1 ? 's' : ''})</span></div>
                    {f.descripcion && <div className="desc">{f.descripcion}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ fontSize: '1rem', padding: '10px 28px' }}>
          {loading ? 'Calculando...' : 'Calcular y Guardar Cotización'}
        </button>
      </form>

      {/* Resultado */}
      {resultado && (
        <div className="resultado">
          <h3>Cotización #{resultado.id.slice(0, 8).toUpperCase()}</h3>

          <div className="resultado-grid">
            <div className="res-item"><label>Duración</label><div className="val">{resultado.duracion_meses} meses</div></div>
            <div className="res-item"><label>Puntaje de riesgo</label><div className="val">{resultado.puntaje_riesgo} pts</div></div>
            <div className="res-item"><label>Margen (GM)</label><div className="val">{(resultado.gm * 100).toFixed(0)}%</div></div>
            <div className="res-item"><label>Costo mano de obra</label><div className="val">{fmt(resultado.costo_MO)}</div></div>
            <div className="res-item"><label>Costo herramientas</label><div className="val">{fmt(resultado.costo_herramientas)}</div></div>
            <div className="res-item"><label>Costo infraestructura</label><div className="val">{fmt(resultado.costo_infra)}</div></div>
          </div>

          <hr className="resultado-divider" />

          <div className="resultado-grid">
            <div className="res-item"><label>Costo total</label><div className="val">{fmt(resultado.costo_total)}</div></div>
            <div className="res-item"><label>Utilidad</label><div className="val">{fmt(resultado.utilidad)}</div></div>
            <div className="res-item"><label>Estado</label><div className="val">{resultado.estado}</div></div>
          </div>

          <hr className="resultado-divider" />

          <div className="precio-box">
            <div className="label">PRECIO FIJO DE VENTA</div>
            <div className="precio">{fmt(resultado.precio_fijo)}</div>
          </div>

          <div className="resultado-grid" style={{ marginTop: 12 }}>
            <div className="res-item"><label>Precio / mes</label><div className="val">{fmt(resultado.precio_mensual)}</div></div>
            <div className="res-item"><label>Precio / día</label><div className="val">{fmt(resultado.precio_diario)}</div></div>
            <div className="res-item"><label>Precio / hora</label><div className="val">{fmt(resultado.precio_hora)}</div></div>
          </div>
        </div>
      )}
    </>
  );
}
