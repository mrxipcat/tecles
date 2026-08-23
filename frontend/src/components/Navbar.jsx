import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./Button.jsx";
import { ChevronDownIcon, LogOutIcon } from "./icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveSlotLabel } from "../utils/entityLabels.js";

function navLinkClass({ isActive }) {
  return `nav-link ${isActive ? "is-active" : ""}`;
}

export default function Navbar() {
  const { t, i18n } = useTranslation("navbar");
  const { user, entity, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const location = useLocation();
  const plural = resolveSlotLabel(entity?.slot_label_plural, i18n.language) ?? t("sessionsFallback");
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
            {t("superadminEntities")}
          </NavLink>
        )}
        {isAuthenticated && !isSuperadmin && (
          <>
            <NavLink to="/" end className={navLinkClass}>
              {t("list")}
            </NavLink>
            <NavLink to="/calendari" className={navLinkClass}>
              {t("calendar")}
            </NavLink>
            <NavLink to="/les-meves-reserves" className={navLinkClass}>
              {t("myReservations")}
            </NavLink>
            {isAdmin && (
              <div className="nav-dropdown" ref={adminMenuRef}>
                <button
                  type="button"
                  className={`nav-link nav-dropdown-toggle ${isAdminRouteActive ? "is-active" : ""}`}
                  onClick={() => setAdminMenuOpen((prev) => !prev)}
                >
                  {t("administration")}
                  <ChevronDownIcon />
                </button>
                {adminMenuOpen && (
                  <div className="nav-dropdown-menu">
                    <NavLink to="/admin/sessions" className={navLinkClass}>
                      {plural}
                    </NavLink>
                    {entity?.is_multiroom && (
                      <NavLink to="/admin/sales" className={navLinkClass}>
                        {t("rooms")}
                      </NavLink>
                    )}
                    <NavLink to="/admin/usuaris" className={navLinkClass}>
                      {t("users")}
                    </NavLink>
                    <NavLink to="/admin/entitat" className={navLinkClass}>
                      {t("config")}
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
            <Link to="/perfil" className="nav-link">
              {user.full_name || user.username} ({t(`roles.${user.role}`)})
            </Link>
            <Button icon={LogOutIcon} onClick={logout}>
              {t("logout")}
            </Button>
          </>
        ) : (
          <Link to="/login">{t("login")}</Link>
        )}
      </div>
    </nav>
  );
}
