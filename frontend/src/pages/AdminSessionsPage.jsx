import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import {
  CalendarXIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "../components/icons.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import RoomFilterBar from "../components/RoomFilterBar.jsx";
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
  is_active: true,
};

export default function AdminSessionsPage() {
  const { user, entity } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomIds, setActiveRoomIds] = useState(null);
  const [form, setForm] = useState(null);
  const [packOpen, setPackOpen] = useState(false);
  const [packMessage, setPackMessage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
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
      client.get("/rooms", { params: { entity_id: user.entity_id } }).then(({ data }) => {
        setRooms(data);
        setActiveRoomIds(new Set(data.map((room) => room.id)));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiroom]);

  function toggleRoom(roomId) {
    setActiveRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  // En canviar el filtre de grups (o recarregar sessions), manté seleccionades
  // només les sessions que continuen essent visibles.
  useEffect(() => {
    if (!isMultiroom || !activeRoomIds) return;
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        const session = sessions.find((s) => s.id === id);
        if (session && activeRoomIds.has(session.room_id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeRoomIds, sessions, isMultiroom]);

  function toggleReservations(sessionId) {
    setExpandedId((prev) => (prev === sessionId ? null : sessionId));
  }

  function toggleSelected(sessionId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === visibleSessions.length ? new Set() : new Set(visibleSessions.map((s) => s.id))
    );
  }

  async function handleToggleActive(session) {
    await client.patch(`/sessions/${session.id}`, { is_active: !session.is_active });
    load();
  }

  async function handleBulkSetActive(isActive) {
    await client.patch("/sessions/bulk-active", {
      session_ids: [...selectedIds],
      is_active: isActive,
    });
    setSelectedIds(new Set());
    load();
  }

  async function handleBulkConfirmPending() {
    if (!window.confirm("Vols confirmar totes les reserves pendents de les sessions seleccionades?")) {
      return;
    }
    await client.patch("/reservations/bulk-confirm", { session_ids: [...selectedIds] });
    setSelectedIds(new Set());
    load();
  }

  async function handleBulkCancelReservations() {
    if (!window.confirm("Vols cancel·lar totes les reserves (pendents i confirmades) de les sessions seleccionades?")) {
      return;
    }
    await client.patch("/reservations/bulk-cancel", { session_ids: [...selectedIds] });
    setSelectedIds(new Set());
    load();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Vols esborrar les ${selectedIds.size} sessions seleccionades? Aquesta acció no es pot desfer.`)) {
      return;
    }
    await client.delete("/sessions/bulk", { data: { session_ids: [...selectedIds] } });
    setSelectedIds(new Set());
    load();
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
      is_active: session.is_active,
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
      is_active: form.is_active,
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
  const columnCount = 8 + (isMultiroom ? 1 : 0) + (showPending ? 1 : 0);
  const visibleSessions =
    isMultiroom && activeRoomIds ? sessions.filter((s) => activeRoomIds.has(s.room_id)) : sessions;

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

      {isMultiroom && <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />}

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
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
            />
            Actiu (visible als usuaris)
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

      {selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <h3>Accions ràpides sobre sessions sel·leccionades ({selectedIds.size})</h3>
          <div className="table-actions">
            <Button icon={CheckIcon} variant="primary" onClick={() => handleBulkSetActive(true)}>
              Activar
            </Button>
            <Button icon={XIcon} onClick={() => handleBulkSetActive(false)}>
              Desactivar
            </Button>
            <Button icon={CheckIcon} onClick={handleBulkConfirmPending}>
              Confirmar pendents
            </Button>
            <Button icon={CalendarXIcon} onClick={handleBulkCancelReservations}>
              Cancel·lar reserves
            </Button>
            <Button icon={TrashIcon} variant="danger" onClick={handleBulkDelete}>
              Esborrar
            </Button>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={visibleSessions.length > 0 && selectedIds.size === visibleSessions.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Títol</th>
            {isMultiroom && <th>Grup</th>}
            <th>Data</th>
            <th>Horari</th>
            <th>Places</th>
            <th>Actiu</th>
            {showPending && <th>Pendents</th>}
            <th>Confirmades</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleSessions.map((session) => (
            <Fragment key={session.id}>
              <tr className={session.is_active ? "" : "row-inactive"}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(session.id)}
                    onChange={() => toggleSelected(session.id)}
                  />
                </td>
                <td>{session.title || <em>(sense títol)</em>}</td>
                {isMultiroom && <td>{session.room_name}</td>}
                <td>{session.date}</td>
                <td>
                  {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
                </td>
                <td>{session.capacity}</td>
                <td>{session.is_active ? "Sí" : "No"}</td>
                {showPending && <td>{session.pending_count ?? 0}</td>}
                <td>{session.confirmed_count ?? 0}</td>
                <td>
                  <div className="table-actions">
                    <Button icon={PencilIcon} onClick={() => handleEdit(session)}>
                      Editar
                    </Button>
                    <Button icon={PowerIcon} onClick={() => handleToggleActive(session)}>
                      {session.is_active ? "Desactivar" : "Activar"}
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
                      onChanged={load}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {visibleSessions.length === 0 && (
            <tr>
              <td colSpan={columnCount}>No hi ha sessions configurades.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
