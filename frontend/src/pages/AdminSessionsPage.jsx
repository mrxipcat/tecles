import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { ChevronDownIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "../components/icons.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import SessionPackForm from "../components/SessionPackForm.jsx";
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
  const [packOpen, setPackOpen] = useState(false);
  const [packMessage, setPackMessage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  const singular = entity?.slot_label_singular ?? "Sessió";
  const plural = entity?.slot_label_plural ?? "Sessions";
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
    setError(null);
    setPackOpen(false);
    setForm(EMPTY_FORM);
  }

  function handleOpenPack() {
    setError(null);
    setForm(null);
    setPackMessage(null);
    setPackOpen(true);
  }

  function handlePackCreated(count) {
    setPackOpen(false);
    setPackMessage(`S'han creat ${count} sessions.`);
    load();
  }

  function handleEdit(session) {
    setError(null);
    setPackOpen(false);
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
    setError(null);

    if (form.end_time <= form.start_time) {
      setError("L'hora de finalització ha de ser posterior a l'hora d'inici.");
      return;
    }

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
    try {
      if (form.id) {
        await client.patch(`/sessions/${form.id}`, payload);
      } else {
        await client.post("/sessions", { ...payload, entity_id: user.entity_id });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || `No s'ha pogut desar ${singular.toLowerCase()}.`);
    }
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
        {!form && !packOpen && (
          <div className="table-actions">
            <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
              Nova {singular}
            </Button>
            <Button icon={PlusIcon} onClick={handleOpenPack}>
              Nou pack de sessions
            </Button>
          </div>
        )}
      </div>

      {packMessage && <p className="info">{packMessage}</p>}

      {packOpen && (
        <SessionPackForm
          isMultiroom={isMultiroom}
          rooms={rooms}
          onCreated={handlePackCreated}
          onCancel={() => setPackOpen(false)}
        />
      )}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? `Editar ${singular}` : `Nova ${singular}`}</h2>
          <label>
            Títol (opcional)
            <input value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
          </label>
          {isMultiroom && (
            <label>
              Grup
              <select value={form.room_id} onChange={(e) => handleChange("room_id", e.target.value)} required>
                <option value="" disabled>
                  Selecciona un grup
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
            <RichTextEditor
              value={form.description}
              onChange={(html) => handleChange("description", html)}
              placeholder="Descripció (opcional)"
            />
          </label>
          <label>
            Data
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
          </label>
          <div className="form-row">
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
          </div>
          {error && <p className="error">{error}</p>}
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
            <th>Títol</th>
            {isMultiroom && <th>Grup</th>}
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
                  <div className="table-actions">
                    <Button icon={PencilIcon} onClick={() => handleEdit(session)}>
                      Editar
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(session.id)}>
                      Esborrar
                    </Button>
                    <Button
                      icon={ChevronDownIcon}
                      expanded={expandedId === session.id}
                      onClick={() => toggleReservations(session.id)}
                    >
                      {expandedId === session.id ? "Amagar reserves" : "Veure reserves"}
                    </Button>
                  </div>
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
