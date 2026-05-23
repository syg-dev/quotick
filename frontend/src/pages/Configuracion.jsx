import { useEffect, useState } from 'react';
import { api } from '../api';

const TABS = ['Parámetros', 'Servicios', 'Herramientas', 'Factores de riesgo'];

/* ─── Parámetros ─── */
function TabParametros() {
  const [data, setData]   = useState(null);
  const [form, setForm]   = useState({});
  const [msg,  setMsg]    = useState('');

  useEffect(() => { api.get('/parametros').then(d => { setData(d); setForm(d); }); }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await api.post('/parametros', { trm: Number(form.trm), dias_mes: Number(form.dias_mes), horas_dia: Number(form.horas_dia), utilizacion: Number(form.utilizacion), gm_umbrales: form.gm_umbrales });
      setMsg('Guardado correctamente');
    } catch (err) { setMsg('Error: ' + err.message); }
  };

  if (!data) return <div className="empty">Cargando...</div>;
  return (
    <form onSubmit={save}>
      {msg && <div className={msg.startsWith('Error') ? 'error-msg' : 'success-msg'}>{msg}</div>}
      <div className="form-row cols-2">
        <div className="form-group"><label>TRM (COP/USD)</label><input type="number" value={form.trm || ''} onChange={e => setF('trm', e.target.value)} required /></div>
        <div className="form-group"><label>Días comerciales / mes</label><input type="number" value={form.dias_mes || ''} onChange={e => setF('dias_mes', e.target.value)} required /></div>
        <div className="form-group"><label>Horas / día</label><input type="number" value={form.horas_dia || ''} onChange={e => setF('horas_dia', e.target.value)} required /></div>
        <div className="form-group"><label>Utilización (0.00 – 1.00)</label><input type="number" step="0.01" min="0" max="1" value={form.utilizacion || ''} onChange={e => setF('utilizacion', e.target.value)} required /></div>
      </div>
      <div className="form-row cols-2">
        <div className="form-group"><label>Umbral bajo (puntaje ≤ → GM 40%)</label><input type="number" value={form.gm_umbrales?.bajo ?? ''} onChange={e => setF('gm_umbrales', { ...form.gm_umbrales, bajo: Number(e.target.value) })} /></div>
        <div className="form-group"><label>Umbral medio (puntaje ≤ → GM 50%)</label><input type="number" value={form.gm_umbrales?.medio ?? ''} onChange={e => setF('gm_umbrales', { ...form.gm_umbrales, medio: Number(e.target.value) })} /></div>
      </div>
      <button type="submit" className="btn btn-primary">Guardar parámetros</button>
    </form>
  );
}

/* ─── CRUD genérico ─── */
function CrudTab({ endpoint, fields, labels }) {
  const [lista,   setLista]   = useState([]);
  const [form,    setForm]    = useState({});
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState('');

  const load = () => api.get(endpoint).then(setLista).catch(() => {});
  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editing) { await api.put(`${endpoint}/${editing}`, form); setEditing(null); }
      else await api.post(endpoint, form);
      setForm({}); load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => { if (!confirm('¿Eliminar?')) return; await api.delete(`${endpoint}/${id}`); load(); };
  const edit = (item) => { setEditing(item.id); const f = {}; fields.forEach(k => f[k] = item[k] ?? ''); setForm(f); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
      <div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          {fields.map((k, i) => (
            <div className="form-group" key={k}>
              <label>{labels[i]}</label>
              <input value={form[k] ?? ''} onChange={e => setF(k, e.target.value)} required type={k.includes('costo') || k.includes('usd') || k.includes('cantidad') || k === 'puntos' ? 'number' : 'text'} min="0" step="any" />
            </div>
          ))}
          <div className="flex-gap" style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-primary btn-sm">{editing ? 'Guardar' : 'Agregar'}</button>
            {editing && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setForm({}); }}>Cancelar</button>}
          </div>
        </form>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{labels.map(l => <th key={l}>{l}</th>)}<th></th></tr></thead>
          <tbody>
            {lista.length === 0 ? <tr><td colSpan={labels.length + 1} className="empty">Sin registros</td></tr> :
              lista.map(item => (
                <tr key={item.id}>
                  {fields.map(k => <td key={k}>{item[k] ?? '—'}</td>)}
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-secondary btn-sm" onClick={() => edit(item)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(item.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Configuracion page ─── */
export default function Configuracion() {
  const [tab, setTab] = useState(0);
  return (
    <>
      <div className="page-title">Configuración</div>
      <div className="card">
        <div className="flex-gap" style={{ marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
          {TABS.map((t, i) => (
            <button key={t} className={`btn btn-sm ${tab === i ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
        {tab === 0 && <TabParametros />}
        {tab === 1 && <CrudTab endpoint="/servicios"      fields={['rol', 'costo_mensual_actual', 'costo_mensual_subida', 'notas']} labels={['Rol', 'Costo mensual actual', 'Costo mensual c/subida', 'Notas']} />}
        {tab === 2 && <CrudTab endpoint="/herramientas"   fields={['nombre', 'usd_seat', 'cantidad']}                               labels={['Herramienta', 'USD/seat', 'Cantidad']} />}
        {tab === 3 && <CrudTab endpoint="/factores-riesgo" fields={['factor', 'puntos', 'descripcion']}                              labels={['Factor', 'Puntos', 'Descripción']} />}
      </div>
    </>
  );
}
