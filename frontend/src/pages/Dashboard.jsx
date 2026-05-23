import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmt } from '../api';

const ESTADO_BADGE = {
  borrador:  'badge-gray',
  enviada:   'badge-blue',
  aprobada:  'badge-green',
  rechazada: 'badge-red',
};

export default function Dashboard() {
  const [cots, setCots]   = useState([]);
  const [params, setParams] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cotizaciones').then(setCots).catch(() => {});
    api.get('/parametros').then(setParams).catch(() => {});
  }, []);

  const recientes = cots.slice(0, 5);
  const total = cots.length;
  const aprobadas = cots.filter(c => c.estado === 'aprobada').length;
  const pendientes = cots.filter(c => c.estado === 'borrador' || c.estado === 'enviada').length;

  return (
    <>
      <div className="page-title">Dashboard</div>

      <div className="form-row cols-3">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#FF9900' }}>{total}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Total cotizaciones</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2e7d32' }}>{aprobadas}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Aprobadas</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1565c0' }}>{pendientes}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>En proceso</div>
        </div>
      </div>

      {params && (
        <div className="card">
          <div className="card-title">Parámetros activos</div>
          <div className="form-row cols-3">
            <div><label>TRM</label><strong>{fmt(params.trm).replace('COP', '').trim()}</strong></div>
            <div><label>Horas productivas/mes</label><strong>{params.dias_mes * params.horas_dia * params.utilizacion} h</strong></div>
            <div><label>Utilización</label><strong>{(params.utilizacion * 100).toFixed(0)}%</strong></div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Cotizaciones recientes</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/nueva')}>+ Nueva</button>
        </div>
        {recientes.length === 0 ? (
          <div className="empty">No hay cotizaciones aún</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Proyecto</th><th>Fecha</th><th>Precio fijo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {recientes.map(c => (
                  <tr key={c.id}>
                    <td>{c.nombre_proyecto}</td>
                    <td>{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                    <td>{fmt(c.precio_fijo)}</td>
                    <td><span className={`badge ${ESTADO_BADGE[c.estado] || 'badge-gray'}`}>{c.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
