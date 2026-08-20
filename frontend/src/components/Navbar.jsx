import { Link, NavLink } from "react-router-dom";
import Button from "./Button.jsx";
import { LogOutIcon } from "./icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function navLinkClass({ isActive }) {
  return `nav-link ${isActive ? "is-active" : ""}`;
}

export default function Navbar() {
  const { user, entity, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const plural = entity?.slot_label_plural ?? "Sessions";
  const roomPlural = entity?.room_label_plural ?? "Sales";
  const brand = isAuthenticated && entity ? entity.name : "Tecles";

  return (
    <nav className="navbar">
      <div className="navbar-brand">{brand}</div>
      <div className="navbar-links">
        {isAuthenticated && isSuperadmin && (
          <NavLink to="/superadmin/entitats" className={navLinkClass}>
            Superadmin: Entitats
          </NavLink>
        )}
        {isAuthenticated && !isSuperadmin && (
          <>
            <NavLink to="/" end className={navLinkClass}>
              Llistat
            </NavLink>
            <NavLink to="/calendari" className={navLinkClass}>
              Calendari
            </NavLink>
            {!isAdmin && (
              <NavLink to="/les-meves-reserves" className={navLinkClass}>
                Les meves reserves
              </NavLink>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin/sessions" className={navLinkClass}>
                  {plural}
                </NavLink>
                {entity?.is_multiroom && (
                  <NavLink to="/admin/sales" className={navLinkClass}>
                    {roomPlural}
                  </NavLink>
                )}
                <NavLink to="/admin/usuaris" className={navLinkClass}>
                  Usuaris
                </NavLink>
                <NavLink to="/admin/entitat" className={navLinkClass}>
                  Configuració
                </NavLink>
              </>
            )}
          </>
        )}
      </div>
      <div className="navbar-user">
        {isAuthenticated ? (
          <>
            <span>{user.full_name || user.username} ({user.role})</span>
            <Button icon={LogOutIcon} onClick={logout}>
              Sortir
            </Button>
          </>
        ) : (
          <Link to="/login">Entrar</Link>
        )}
      </div>
    </nav>
  );
}
