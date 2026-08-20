import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import SessionReservationsPanel from "../components/SessionReservationsPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = {
  id: null,
  title: "",
  description: "",
  date: "",
  start_time: "",
  end_time: "",
  capacity: 1,
  room_id: "",
};

export default function AdminSessionsPage() {
  const { user, entity } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const singular = entity?.slot_label_singular ?? "Sessió";
  const plural = entity?.slot_label_plural ?? "Sessions";
  const roomSingular = entity?.room_label_singular ?? "Sala";
  const isMultiroom = Boolean(entity?.is_multiroom);

  async function load() {
    const { data } = await client.get("/sessions", { params: { entity_id: user.entity_id } });
    setSessions(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMultiroom) {
      client.get("/rooms", { params: { entity_id: user.entity_id } }).then(({ data }) => setRooms(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiroom]);

  function toggleReservations(sessionId) {
    setExpandedId((prev) => (prev === sessionId ? null : sessionId));
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNew() {
    setForm(EMPTY_FORM);
  }

  function handleEdit(session) {
    setForm({
      id: session.id,
      title: session.title || "",
      description: session.description || "",
      date: session.date,
      start_time: session.start_time?.slice(0, 5),
      end_time: session.end_time?.slice(0, 5),
      capacity: session.capacity,
      room_id: session.room_id ?? "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      title: form.title || null,
      description: form.description,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: Number(form.capacity),
    };
    if (isMultiroom) {
      payload.room_id = Number(form.room_id);
    }
    if (form.id) {
      await client.patch(`/sessions/${form.id}`, payload);
    } else {
      await client.post("/sessions", { ...payload, entity_id: user.entity_id });
    }
    setForm(null);
    load();
  }

  async function handleDelete(sessionId) {
    await client.delete(`/sessions/${sessionId}`);
    load();
  }

  const showPending = entity && !entity.auto_confirm_reservations;
  const columnCount = 6 + (isMultiroom ? 1 : 0) + (showPending ? 1 : 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Administració de {plural}</h1>
        {!form && <button onClick={handleNew}>Nova {singular}</button>}
      </div>

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? `Editar ${singular}` : `Nova ${singular}`}</h2>
          <label>
            Títol (opcional)
            <input value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
          </label>
          {isMultiroom && (
            <label>
              {roomSingular}
              <select value={form.room_id} onChange={(e) => handleChange("room_id", e.target.value)} required>
                <option value="" disabled>
                  Selecciona {roomSingular.toLowerCase()}
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Descripció
            <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} />
          </label>
          <label>
            Data
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
          </label>
          <label>
            Hora d'inici
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => handleChange("start_time", e.target.value)}
              required
            />
          </label>
          <label>
            Hora de final
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => handleChange("end_time", e.target.value)}
              required
            />
          </label>
          <label>
            Places
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => handleChange("capacity", e.target.value)}
              required
            />
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
            <th>Títol</th>
            {isMultiroom && <th>{roomSingular}</th>}
            <th>Data</th>
            <th>Horari</th>
            <th>Places</th>
            {showPending && <th>Pendents</th>}
            <th>Confirmades</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <Fragment key={session.id}>
              <tr>
                <td>{session.title || <em>(sense títol)</em>}</td>
                {isMultiroom && <td>{session.room_name}</td>}
                <td>{session.date}</td>
                <td>
                  {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
                </td>
                <td>{session.capacity}</td>
                {showPending && <td>{session.pending_count ?? 0}</td>}
                <td>{session.confirmed_count ?? 0}</td>
                <td>
                  <button onClick={() => handleEdit(session)}>Editar</button>
                  <button onClick={() => handleDelete(session.id)}>Esborrar</button>
                  <button onClick={() => toggleReservations(session.id)}>
                    {expandedId === session.id ? "Amagar reserves" : "Veure reserves"}
                  </button>
                </td>
              </tr>
              {expandedId === session.id && entity && (
                <tr>
                  <td colSpan={columnCount}>
                    <SessionReservationsPanel
                      sessionId={session.id}
                      autoConfirm={entity.auto_confirm_reservations}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={columnCount}>No hi ha sessions configurades.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
