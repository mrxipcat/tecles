import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { CheckIcon, KeyIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = {
  id: null,
  username: "",
  full_name: "",
  email: "",
  role: "user",
  initial_password: "",
  visible_room_ids: [],
};

export default function AdminUsersPage() {
  const { user, entity } = useAuth();
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState(null);
  const isMultiroom = Boolean(entity?.is_multiroom);
  const columnCount = isMultiroom ? 7 : 6;

  async function load() {
    const { data } = await client.get("/users");
    setUsers(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isMultiroom) {
      client.get("/rooms", { params: { entity_id: user.entity_id } }).then(({ data }) => setRooms(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiroom]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleFormRoom(roomId) {
    setForm((prev) => {
      const current = prev.visible_room_ids;
      const next = current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId];
      return { ...prev, visible_room_ids: next };
    });
  }

  function handleNew() {
    setError(null);
    setForm(EMPTY_FORM);
  }

  function handleEdit(target) {
    setError(null);
    setForm({
      id: target.id,
      username: target.username,
      full_name: target.full_name || "",
      email: target.email || "",
      role: target.role,
      visible_room_ids: target.visible_room_ids || [],
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      if (form.id) {
        await client.patch(`/users/${form.id}`, {
          full_name: form.full_name,
          email: form.email || null,
          role: form.role,
          visible_room_ids: form.visible_room_ids,
        });
      } else {
        await client.post("/users", {
          username: form.username,
          full_name: form.full_name,
          email: form.email || null,
          role: form.role,
          initial_password: form.initial_password,
          visible_room_ids: form.visible_room_ids,
        });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut desar l'usuari.");
    }
  }

  async function handleDelete(userId) {
    setError(null);
    try {
      await client.delete(`/users/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut eliminar l'usuari.");
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
      await client.post(`/users/${userId}/reset-password`, { new_password: resetPassword });
      setResetId(null);
      setResetPassword("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut reiniciar la contrasenya.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Administració d'usuaris</h1>
        {!form && (
          <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
            Nou usuari
          </Button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? "Editar usuari" : "Nou usuari"}</h2>
          <label>
            Nom d'usuari
            <input
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              disabled={Boolean(form.id)}
              required
            />
          </label>
          <label>
            Nom complet
            <input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
          </label>
          <label>
            Correu electrònic
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </label>
          <label>
            Rol
            <select value={form.role} onChange={(e) => handleChange("role", e.target.value)}>
              <option value="user">Usuari</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {isMultiroom && form.role === "user" && (
            <label>
              Grups visibles (cap seleccionat = tots)
              <div className="room-checkbox-list">
                {rooms.map((room) => (
                  <label key={room.id}>
                    <input
                      type="checkbox"
                      checked={form.visible_room_ids.includes(room.id)}
                      onChange={() => toggleFormRoom(room.id)}
                    />
                    {room.name}
                  </label>
                ))}
              </div>
            </label>
          )}
          {!form.id && (
            <label>
              Contrasenya inicial
              <input
                type="text"
                value={form.initial_password}
                onChange={(e) => handleChange("initial_password", e.target.value)}
                required
              />
            </label>
          )}
          {!form.id && <p className="info">L'usuari haurà de canviar-la en el primer inici de sessió.</p>}
          <div className="admin-form-actions">
            <Button type="submit" icon={form.id ? SaveIcon : PlusIcon} variant="primary">
              {form.id ? "Desar canvis" : "Crear"}
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              Tancar
            </Button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Usuari</th>
            <th>Nom complet</th>
            <th>Correu electrònic</th>
            <th>Rol</th>
            {isMultiroom && <th>Grups visibles</th>}
            <th>Ha de canviar contrasenya</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Fragment key={u.id}>
              <tr>
                <td>{u.username}</td>
                <td>{u.full_name}</td>
                <td>{u.email || "—"}</td>
                <td>{u.role === "admin" ? "Administrador" : "Usuari"}</td>
                {isMultiroom && (
                  <td>
                    {u.role === "user" ? u.visible_room_names.join(", ") || "Totes" : "—"}
                  </td>
                )}
                <td>{u.must_change_password ? "Sí" : "No"}</td>
                <td>
                  <div className="table-actions">
                    <Button icon={PencilIcon} onClick={() => handleEdit(u)}>
                      Editar
                    </Button>
                    <Button icon={KeyIcon} onClick={() => handleResetToggle(u.id)}>
                      Reiniciar contrasenya
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(u.id)}>
                      Esborrar
                    </Button>
                  </div>
                </td>
              </tr>
              {resetId === u.id && (
                <tr>
                  <td colSpan={columnCount}>
                    <form className="inline-form" onSubmit={(e) => handleResetSubmit(e, u.id)}>
                      <label>
                        Contrasenya nova
                        <input
                          type="text"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                        />
                      </label>
                      <Button type="submit" icon={CheckIcon} variant="primary">
                        Confirmar
                      </Button>
                      <Button icon={XIcon} onClick={() => setResetId(null)}>
                        Cancel·lar
                      </Button>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={columnCount}>No hi ha usuaris configurats.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
