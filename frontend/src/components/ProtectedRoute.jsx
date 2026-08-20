import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  blockAdmin = false,
  requireSuperadmin = false,
}) {
  const { isAuthenticated, isAdmin, isSuperadmin, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (mustChangePassword && location.pathname !== "/canviar-contrasenya") {
    return <Navigate to="/canviar-contrasenya" replace />;
  }
  if (isSuperadmin && !requireSuperadmin && location.pathname !== "/canviar-contrasenya") {
    return <Navigate to="/superadmin/entitats" replace />;
  }
  if (requireSuperadmin && !isSuperadmin) {
    return <Navigate to="/" replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (blockAdmin && isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}
