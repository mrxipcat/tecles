import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminEntityConfigPage from "./pages/AdminEntityConfigPage.jsx";
import AdminRoomsPage from "./pages/AdminRoomsPage.jsx";
import AdminSessionsPage from "./pages/AdminSessionsPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MyReservationsPage from "./pages/MyReservationsPage.jsx";
import SessionsCalendarPage from "./pages/SessionsCalendarPage.jsx";
import SessionsListPage from "./pages/SessionsListPage.jsx";
import SuperadminEntitiesPage from "./pages/SuperadminEntitiesPage.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/canviar-contrasenya"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SessionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendari"
            element={
              <ProtectedRoute>
                <SessionsCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/les-meves-reserves"
            element={
              <ProtectedRoute>
                <MyReservationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sessions"
            element={
              <ProtectedRoute requireAdmin>
                <AdminSessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entitat"
            element={
              <ProtectedRoute requireAdmin>
                <AdminEntityConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sales"
            element={
              <ProtectedRoute requireAdmin>
                <AdminRoomsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuaris"
            element={
              <ProtectedRoute requireAdmin>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/entitats"
            element={
              <ProtectedRoute requireSuperadmin>
                <SuperadminEntitiesPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
