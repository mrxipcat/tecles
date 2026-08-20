import { Fragment, useCallback, useEffect, useState } from "react";
import client from "../api/client.js";

const EMPTY_FORM = { username: "", full_name: "", initial_password: "" };

export default function SuperadminEntityAdminsPanel({ entityId }) {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data } = await client.get(`/superadmin/entities/${entityId}/admins`);
    setAdmins(data);
  }, [entityId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await client.post(`/superadmin/entities/${entityId}/admins`, form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut crear l'administrador.");
    }
  }

  async function handleDelete(userId) {
    setError(null);
    try {
      await client.delete(`/superadmin/admins/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut eliminar l'administrador.");
    }
  }

  function handleResetToggle(userId) {
    setError(null);
    setResetPassword("");
    setResetId((prev) => (prev === userId ? null : userId));
  }

  async function handleResetSubmit(event, userId) {
    event.preventDefault();
    setError(null);
    try {
      await client.post(`/superadmin/admins/${userId}/reset-password`, { new_password: resetPassword });
      setResetId(null);
      setResetPassword("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut reiniciar la contrasenya.");
    }
  }

  return (
    <div className="reservations-panel">
      {error && <p className="error">{error}</p>}
      <h4>Administradors de l'entitat</h4>
      <table>
        <thead>
          <tr>
            <th>Usuari</th>
            <th>Nom complet</th>
            <th>Ha de canviar contrasenya</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <Fragment key={admin.id}>
              <tr>
                <td>{admin.username}</td>
                <td>{admin.full_name}</td>
                <td>{admin.must_change_password ? "Sí" : "No"}</td>
                <td>
                  <button onClick={() => handleResetToggle(admin.id)}>Reiniciar contrasenya</button>
                  <button onClick={() => handleDelete(admin.id)}>Esborrar</button>
                </td>
              </tr>
              {resetId === admin.id && (
                <tr>
                  <td colSpan={4}>
                    <form className="inline-form" onSubmit={(e) => handleResetSubmit(e, admin.id)}>
                      <label>
                        Contrasenya nova
                        <input
                          type="text"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                        />
                      </label>
                      <button type="submit">Confirmar</button>
                      <button type="button" onClick={() => setResetId(null)}>
                        Cancel·lar
                      </button>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {admins.length === 0 && (
            <tr>
              <td colSpan={4}>Cap administrador configurat.</td>
            </tr>
          )}
        </tbody>
      </table>

      {form ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Usuari
            <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} required />
          </label>
          <label>
            Nom complet
            <input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
          </label>
          <label>
            Contrasenya inicial
            <input
              type="text"
              value={form.initial_password}
              onChange={(e) => handleChange("initial_password", e.target.value)}
              required
            />
          </label>
          <button type="submit">Crear</button>
          <button type="button" onClick={() => setForm(null)}>
            Cancel·lar
          </button>
        </form>
      ) : (
        <button onClick={() => setForm(EMPTY_FORM)}>Nou administrador</button>
      )}
    </div>
  );
}
