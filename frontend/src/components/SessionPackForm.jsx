import { useState } from "react";
import { useTranslation } from "react-i18next";
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

function parseStartTimes(raw, emptyMessage) {
  const times = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (times.length === 0) {
    throw new Error(emptyMessage);
  }
  return times;
}

export default function SessionPackForm({ isMultiroom, rooms, singular, plural, onCreated, onCancel }) {
  const { t } = useTranslation("sessionPackForm");
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
      setError(t("errors.endDateBeforeStart"));
      return;
    }

    let startTimes;
    try {
      startTimes = parseStartTimes(form.start_times, t("errors.noStartTimes"));
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
      setError(err.response?.data?.detail || t("errors.createFailed", { plural }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2>{t("heading", { plural })}</h2>
      <label>
        {t("fields.title")}
        <input value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
      </label>
      {isMultiroom && (
        <label>
          {t("fields.room")}
          <select value={form.room_id} onChange={(e) => handleChange("room_id", e.target.value)} required>
            <option value="" disabled>
              {t("fields.roomPlaceholder")}
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
          {t("fields.startDate")}
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            required
          />
        </label>
        <label>
          {t("fields.endDate")}
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
          {t("fields.durationHours")}
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
          {t("fields.capacity")}
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
        {t("fields.startTimes")}
        <input
          value={form.start_times}
          onChange={(e) => handleChange("start_times", e.target.value)}
          placeholder={t("fields.startTimesPlaceholder")}
          required
        />
      </label>
      <p className="info">{t("info", { singular })}</p>
      {error && <p className="error">{error}</p>}
      <div className="admin-form-actions">
        <Button type="submit" icon={PlusIcon} variant="primary" disabled={submitting}>
          {t("actions.submit", { plural })}
        </Button>
        <Button icon={XIcon} onClick={onCancel} disabled={submitting}>
          {t("actions.cancel")}
        </Button>
      </div>
    </form>
  );
}
