import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada'];
const BADGE = { borrador: 'badge-gray', enviada: 'badge-blue', aprobada: 'badge-green', rechazada: 'badge-red' };

function BtnPdf({ id }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cotizaciones/${id}/pdf`);
      window.open(res.url, '_blank');
    } catch (e) { alert('Error generando PDF: ' + e.message); }
    finally { setLoading(false); }
  };
  return (
    <button className="btn btn-primary btn-sm" onClick={download} disabled={loading}
      style={{ background: '#e63946', borderColor: '#e63946' }}>
      {loading ? 'Generando...' : '⬇ Descargar PDF'}
    </button>
  );
}

export default function Cotizaciones() {
  const [cots,     setCots]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const load = () => api.get('/cotizaciones').then(setCots).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/cotizaciones/${id}/estado`, { estado });
      load();
      if (selected?.id === id) setSelected(s => ({ ...s, estado }));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="empty">Cargando...</div>;

  return (
    <>
      <div className="page-title">Cotizaciones</div>
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 16 }}>
        <div className="card" style={{ margin: 0 }}>
          {cots.length === 0 ? (
            <div className="empty">Sin cotizaciones aún</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Proyecto</th><th>Fecha</th><th>Precio fijo</th><th>Estado</th></tr></thead>
                <tbody>
                  {cots.map(c => (
                    <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer', background: selected?.id === c.id ? '#fff8e1' : undefined }}>
                      <td>{c.nombre_proyecto}</td>
                      <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                      <td>{fmt(c.precio_fijo)}</td>
                      <td><span className={`badge ${BADGE[c.estado] || 'badge-gray'}`}>{c.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <span className="card-title">{selected.nombre_proyecto}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="form-row cols-2" style={{ marginBottom: 12 }}>
              <div><label>ID</label><small style={{ color: '#888' }}>{selected.id.slice(0, 16)}…</small></div>
              <div><label>Escenario</label><strong>{selected.escenario}</strong></div>
              <div><label>Duración</label><strong>{selected.duracion_meses} meses</strong></div>
              <div><label>GM</label><strong>{(selected.gm * 100).toFixed(0)}%</strong></div>
            </div>
            <hr className="divider" />
            <div className="form-row cols-2">
              <div><label>Costo total</label><strong>{fmt(selected.costo_total)}</strong></div>
              <div><label>Utilidad</label><strong>{fmt(selected.utilidad)}</strong></div>
            </div>
            <div style={{ textAlign: 'center', margin: '14px 0', padding: '12px', background: '#fff8e1', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>PRECIO FIJO</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FF9900' }}>{fmt(selected.precio_fijo)}</div>
            </div>
            <div className="form-row cols-3">
              <div><label>/ mes</label><strong>{fmt(selected.precio_mensual)}</strong></div>
              <div><label>/ día</label><strong>{fmt(selected.precio_diario)}</strong></div>
              <div><label>/ hora</label><strong>{fmt(selected.precio_hora)}</strong></div>
            </div>
            <hr className="divider" />
            <label>Cambiar estado</label>
            <div className="flex-gap" style={{ marginTop: 6 }}>
              {ESTADOS.map(e => (
                <button key={e} className={`btn btn-sm ${selected.estado === e ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => cambiarEstado(selected.id, e)}>{e}</button>
              ))}
            </div>
            <hr className="divider" />
            <BtnPdf id={selected.id} />
          </div>
        )}
      </div>
    </>
  );
}
