import { useState } from "react";
import client from "../api/client.js";
import Button from "./Button.jsx";
import { PlusIcon, XIcon } from "./icons.jsx";

const EMPTY_FORM = {
  title: "",
  room_id: "",
  capacity: 1,
  start_date: "",
  end_date: "",
  duration_hours: "1",
  start_times: "",
};

function parseStartTimes(raw) {
  const times = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (times.length === 0) {
    throw new Error("Cal indicar almenys una hora d'inici.");
  }
  return times;
}

export default function SessionPackForm({ isMultiroom, rooms, onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (form.end_date < form.start_date) {
      setError("La data final ha de ser posterior o igual a la data d'inici.");
      return;
    }

    let startTimes;
    try {
      startTimes = parseStartTimes(form.start_times);
    } catch (err) {
      setError(err.message);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await client.post("/sessions/pack", {
        title: form.title || null,
        room_id: isMultiroom ? Number(form.room_id) : null,
        capacity: Number(form.capacity),
        start_date: form.start_date,
        end_date: form.end_date,
        duration_hours: Number(form.duration_hours),
        start_times: startTimes,
      });
      onCreated(data.length);
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut crear el pack de sessions.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2>Nou pack de sessions</h2>
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
      <div className="form-row">
        <label>
          Data inici
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            required
          />
        </label>
        <label>
          Data final
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Durada (hores)
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={form.duration_hours}
            onChange={(e) => handleChange("duration_hours", e.target.value)}
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
      </div>
      <label>
        Hores d'inici
        <input
          value={form.start_times}
          onChange={(e) => handleChange("start_times", e.target.value)}
          placeholder="8:00, 10:00, 12:00, 16:00"
          required
        />
      </label>
      <p className="info">Es crearà una sessió per cada hora d'inici, cada dia del rang de dates.</p>
      {error && <p className="error">{error}</p>}
      <div className="admin-form-actions">
        <Button type="submit" icon={PlusIcon} variant="primary" disabled={submitting}>
          Crear pack de sessions
        </Button>
        <Button icon={XIcon} onClick={onCancel} disabled={submitting}>
          Cancel·lar
        </Button>
      </div>
    </form>
  );
}
