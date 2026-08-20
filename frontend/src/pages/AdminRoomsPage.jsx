import { useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = { id: null, name: "" };

export default function AdminRoomsPage() {
  const { user, entity } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const roomSingular = entity?.room_label_singular ?? "Sala";
  const roomPlural = entity?.room_label_plural ?? "Sales";
  const roomPluralLower = roomPlural.toLowerCase();
  const roomSingularLower = roomSingular.toLowerCase();

  async function load() {
    const { data } = await client.get("/rooms", { params: { entity_id: user.entity_id } });
    setRooms(data);
  }

  useEffect(() => {
    if (entity?.is_multiroom) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity?.is_multiroom]);

  function handleNew() {
    setError(null);
    setForm(EMPTY_FORM);
  }

  function handleEdit(room) {
    setError(null);
    setForm({ id: room.id, name: room.name });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      if (form.id) {
        await client.patch(`/rooms/${form.id}`, { name: form.name });
      } else {
        await client.post("/rooms", { name: form.name });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || `No s'ha pogut desar ${roomSingularLower}.`);
    }
  }

  async function handleDelete(roomId) {
    setError(null);
    try {
      await client.delete(`/rooms/${roomId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || `No s'ha pogut eliminar ${roomSingularLower}.`);
    }
  }

  if (entity && !entity.is_multiroom) {
    return (
      <div className="page">
        <h1>{roomPlural}</h1>
        <p>Activa el mode multisala a la configuració de l'entitat per gestionar {roomPluralLower}.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Administració de {roomPluralLower}</h1>
        {!form && <button onClick={handleNew}>Nova {roomSingularLower}</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? `Editar ${roomSingularLower}` : `Nova ${roomSingularLower}`}</h2>
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>
          <div className="admin-form-actions">
            <button type="submit">{form.id ? "Desar canvis" : "Crear"}</button>
            <button type="button" onClick={() => setForm(null)}>
              Tancar
            </button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.name}</td>
              <td>
                <button onClick={() => handleEdit(room)}>Editar</button>
                <button onClick={() => handleDelete(room.id)}>Esborrar</button>
              </td>
            </tr>
          ))}
          {rooms.length === 0 && (
            <tr>
              <td colSpan={2}>No hi ha {roomPluralLower} configurades.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
