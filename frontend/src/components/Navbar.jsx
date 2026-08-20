import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, entity, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const plural = entity?.slot_label_plural ?? "Sessions";
  const roomPlural = entity?.room_label_plural ?? "Sales";

  return (
    <nav className="navbar">
      <div className="navbar-brand">WebAules</div>
      <div className="navbar-links">
        {isAuthenticated && isSuperadmin && <Link to="/superadmin/entitats">Superadmin: Entitats</Link>}
        {isAuthenticated && !isSuperadmin && (
          <>
            <Link to="/">Llistat</Link>
            <Link to="/calendari">Calendari</Link>
            {!isAdmin && <Link to="/les-meves-reserves">Les meves reserves</Link>}
            {isAdmin && (
              <>
                <Link to="/admin/sessions">Admin: {plural}</Link>
                {entity?.is_multiroom && <Link to="/admin/sales">Admin: {roomPlural}</Link>}
                <Link to="/admin/usuaris">Admin: Usuaris</Link>
                <Link to="/admin/entitat">Admin: Configuració</Link>
              </>
            )}
          </>
        )}
      </div>
      <div className="navbar-user">
        {isAuthenticated ? (
          <>
            <span>{user.full_name || user.username} ({user.role})</span>
            <button onClick={logout}>Sortir</button>
          </>
        ) : (
          <Link to="/login">Entrar</Link>
        )}
      </div>
    </nav>
  );
}
