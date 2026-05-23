import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard       from './pages/Dashboard';
import NuevaCotizacion from './pages/NuevaCotizacion';
import Cotizaciones    from './pages/Cotizaciones';
import Clientes        from './pages/Clientes';
import Configuracion   from './pages/Configuracion';

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Quotick
          <span>Cotizador de Software</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Principal</div>
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/nueva" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Nueva Cotización
          </NavLink>
          <NavLink to="/cotizaciones" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Cotizaciones
          </NavLink>
          <div className="nav-section">Gestión</div>
          <NavLink to="/clientes" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Clientes
          </NavLink>
          <NavLink to="/configuracion" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Configuración
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/nueva"         element={<NuevaCotizacion />} />
          <Route path="/cotizaciones"  element={<Cotizaciones />} />
          <Route path="/clientes"      element={<Clientes />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
      </main>
    </div>
  );
}
