import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { nombre: '', empresa: '', email: '', contacto: '' };

export default function Clientes() {
  const [lista,   setLista]   = useState([]);
  const [form,    setForm]    = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState('');

  const load = () => api.get('/clientes').then(setLista).catch(() => {});
  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editing) {
        await api.put(`/clientes/${editing}`, form);
        setEditing(null);
      } else {
        await api.post('/clientes', form);
      }
      setForm(emptyForm); load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar cliente?')) return;
    await api.delete(`/clientes/${id}`); load();
  };

  const edit = (c) => { setEditing(c.id); setForm({ nombre: c.nombre, empresa: c.empresa, email: c.email, contacto: c.contacto }); };

  return (
    <>
      <div className="page-title">Clientes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title">{editing ? 'Editar cliente' : 'Nuevo cliente'}</div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label>Nombre</label><input value={form.nombre} onChange={e => setF('nombre', e.target.value)} required /></div>
            <div className="form-group"><label>Empresa</label><input value={form.empresa} onChange={e => setF('empresa', e.target.value)} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
            <div className="form-group"><label>Contacto</label><input value={form.contacto} onChange={e => setF('contacto', e.target.value)} /></div>
            <div className="flex-gap" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Crear'}</button>
              {editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancelar</button>}
            </div>
          </form>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title">Lista de clientes</div>
          {lista.length === 0 ? <div className="empty">Sin clientes</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Empresa</th><th>Email</th><th></th></tr></thead>
                <tbody>
                  {lista.map(c => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td><td>{c.empresa}</td><td>{c.email}</td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-secondary btn-sm" onClick={() => edit(c)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
