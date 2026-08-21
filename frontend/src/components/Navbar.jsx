import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Button from "./Button.jsx";
import { ChevronDownIcon, LogOutIcon } from "./icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function navLinkClass({ isActive }) {
  return `nav-link ${isActive ? "is-active" : ""}`;
}

export default function Navbar() {
  const { user, entity, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const location = useLocation();
  const plural = entity?.slot_label_plural ?? "Sessions";
  const brand = isAuthenticated && entity ? entity.name : "Tecles";
  const isAdminRouteActive = location.pathname.startsWith("/admin");

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    setAdminMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <NavLink to="/les-meves-reserves" className={navLinkClass}>
              Les meves reserves
            </NavLink>
            {isAdmin && (
              <div className="nav-dropdown" ref={adminMenuRef}>
                <button
                  type="button"
                  className={`nav-link nav-dropdown-toggle ${isAdminRouteActive ? "is-active" : ""}`}
                  onClick={() => setAdminMenuOpen((prev) => !prev)}
                >
                  Administració
                  <ChevronDownIcon />
                </button>
                {adminMenuOpen && (
                  <div className="nav-dropdown-menu">
                    <NavLink to="/admin/sessions" className={navLinkClass}>
                      {plural}
                    </NavLink>
                    {entity?.is_multiroom && (
                      <NavLink to="/admin/sales" className={navLinkClass}>
                        Grups
                      </NavLink>
                    )}
                    <NavLink to="/admin/usuaris" className={navLinkClass}>
                      Usuaris
                    </NavLink>
                    <NavLink to="/admin/entitat" className={navLinkClass}>
                      Configuració
                    </NavLink>
                  </div>
                )}
              </div>
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
