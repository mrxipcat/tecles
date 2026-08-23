import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import {
  ArrowRightLeftIcon,
  CalendarXIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
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
import { isExpiredSession } from "../utils/availability.js";
import { resolveSlotLabel } from "../utils/entityLabels.js";

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
  const { t, i18n } = useTranslation("adminSessions");
  const { user, entity } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomIds, setActiveRoomIds] = useState(null);
  const [form, setForm] = useState(null);
  const [packOpen, setPackOpen] = useState(false);
  const [packMessage, setPackMessage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkRoomId, setBulkRoomId] = useState("");
  const [bulkCapacityAmount, setBulkCapacityAmount] = useState(1);
  const [error, setError] = useState(null);

  const singular = resolveSlotLabel(entity?.slot_label_singular, i18n.language) ?? t("sessionFallback");
  const plural = resolveSlotLabel(entity?.slot_label_plural, i18n.language) ?? t("sessionsFallback");
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
    if (!window.confirm(t("confirmBulkConfirmPending"))) {
      return;
    }
    await client.patch("/reservations/bulk-confirm", { session_ids: [...selectedIds] });
    setSelectedIds(new Set());
    load();
  }

  async function handleBulkCancelReservations() {
    if (!window.confirm(t("confirmBulkCancelReservations"))) {
      return;
    }
    await client.patch("/reservations/bulk-cancel", { session_ids: [...selectedIds] });
    setSelectedIds(new Set());
    load();
  }

  async function handleBulkDelete() {
    if (!window.confirm(t("confirmBulkDelete", { count: selectedIds.size }))) {
      return;
    }
    await client.delete("/sessions/bulk", { data: { session_ids: [...selectedIds] } });
    setSelectedIds(new Set());
    load();
  }

  async function handleExportXlsx() {
    setError(null);
    try {
      const response = await client.post(
        "/sessions/export-reservations-xlsx",
        { session_ids: [...selectedIds] },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "inscrits.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || t("errorExportXlsx"));
    }
  }

  async function handleBulkChangeRoom() {
    if (!bulkRoomId) return;
    setError(null);
    try {
      await client.patch("/sessions/bulk-room", {
        session_ids: [...selectedIds],
        room_id: Number(bulkRoomId),
      });
      setBulkRoomId("");
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errorChangeRoom"));
    }
  }

  async function handleDeleteExpired() {
    if (!window.confirm(t("confirmDeleteExpired"))) {
      return;
    }
    setError(null);
    try {
      await client.delete("/sessions/expired");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errorDeleteExpired"));
    }
  }

  async function handleBulkAddCapacity() {
    const amount = Number(bulkCapacityAmount);
    if (!amount || amount <= 0) return;
    setError(null);
    try {
      await client.patch("/sessions/bulk-add-capacity", {
        session_ids: [...selectedIds],
        amount,
      });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errorAddCapacity"));
    }
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
    setPackMessage(t("packCreatedMessage", { count, plural }));
    load();
  }

  function handleEdit(session) {
    setError(null);
    setPackOpen(false);
    setSelectedIds(new Set());
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
      setError(t("errorEndTimeBeforeStart"));
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
      setError(err.response?.data?.detail || t("errorSaveSession", { singular: singular.toLowerCase() }));
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
  const isEditing = Boolean(form) || packOpen;
  const editingSession = form?.id ? sessions.find((s) => s.id === form.id) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("pageHeading", { plural })}</h1>
        {!isEditing && (
          <div className="table-actions">
            <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
              {t("newSessionButton", { singular })}
            </Button>
            <Button icon={PlusIcon} onClick={handleOpenPack}>
              {t("newPackButton", { plural })}
            </Button>
            <Button icon={TrashIcon} variant="danger" onClick={handleDeleteExpired}>
              {t("deleteExpiredButton")}
            </Button>
          </div>
        )}
      </div>

      {!isEditing && error && <p className="error">{error}</p>}

      {!isEditing && isMultiroom && <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />}

      {!isEditing && packMessage && <p className="info">{packMessage}</p>}

      {packOpen && (
        <SessionPackForm
          isMultiroom={isMultiroom}
          rooms={rooms}
          singular={singular}
          plural={plural}
          onCreated={handlePackCreated}
          onCancel={() => setPackOpen(false)}
        />
      )}

      {form && (
        <Fragment>
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? t("formHeadingEdit", { singular }) : t("formHeadingNew", { singular })}</h2>
          {editingSession && (
            <p className={`admin-form-status ${editingSession.is_available ? "is-available" : "is-full"}`}>
              {t("statusConfirmed", { count: editingSession.confirmed_count ?? 0 })}
              {showPending && t("statusPending", { count: editingSession.pending_count ?? 0 })}
              {t("statusTotal", { count: editingSession.capacity })}
            </p>
          )}
          <label>
            {t("labelTitle")}
            <input value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
          </label>
          {isMultiroom && (
            <label>
              {t("labelRoom")}
              <select value={form.room_id} onChange={(e) => handleChange("room_id", e.target.value)} required>
                <option value="" disabled>
                  {t("selectRoomPlaceholder")}
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
            {t("labelDescription")}
            <RichTextEditor
              value={form.description}
              onChange={(html) => handleChange("description", html)}
              placeholder={t("descriptionPlaceholder")}
            />
          </label>
          <label>
            {t("labelDate")}
            <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
          </label>
          <div className="form-row">
            <label>
              {t("labelStartTime")}
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                required
              />
            </label>
            <label>
              {t("labelEndTime")}
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
            {t("labelCapacity")}
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
            {t("labelActive")}
          </label>
          <div className="admin-form-actions">
            <Button type="submit" icon={form.id ? SaveIcon : PlusIcon} variant="primary">
              {form.id ? t("submitSave") : t("submitCreate")}
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              {t("closeButton")}
            </Button>
          </div>
        </form>
        {form.id && entity && (
          <div className="admin-form-reservations">
            <h3>{t("reservationsHeading", { singular: singular.toLowerCase() })}</h3>
            <SessionReservationsPanel
              sessionId={form.id}
              autoConfirm={entity.auto_confirm_reservations}
              onChanged={load}
            />
          </div>
        )}
        </Fragment>
      )}

      {!isEditing && selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <h3>{t("bulkActionsHeading", { count: selectedIds.size })}</h3>
          <div className="table-actions">
            <Button icon={CheckIcon} variant="primary" onClick={() => handleBulkSetActive(true)}>
              {t("activateButton")}
            </Button>
            <Button icon={XIcon} onClick={() => handleBulkSetActive(false)}>
              {t("deactivateButton")}
            </Button>
            <Button icon={CheckIcon} onClick={handleBulkConfirmPending}>
              {t("confirmPendingButton")}
            </Button>
            <Button icon={CalendarXIcon} onClick={handleBulkCancelReservations}>
              {t("cancelReservationsButton")}
            </Button>
            <Button icon={TrashIcon} variant="danger" onClick={handleBulkDelete}>
              {t("deleteButton")}
            </Button>
            <Button icon={DownloadIcon} onClick={handleExportXlsx}>
              {t("exportXlsxButton")}
            </Button>
          </div>
          {isMultiroom && (
            <div className="table-actions">
              <div className="inline-form">
                <label>
                  {t("changeRoomLabel")}
                  <select value={bulkRoomId} onChange={(e) => setBulkRoomId(e.target.value)}>
                    <option value="">{t("selectRoomPlaceholder")}</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button icon={ArrowRightLeftIcon} onClick={handleBulkChangeRoom} disabled={!bulkRoomId}>
                  {t("applyButton")}
                </Button>
              </div>
            </div>
          )}
          <div className="table-actions">
            <div className="inline-form">
              <label>
                {t("addCapacityLabel")}
                <input
                  type="number"
                  min="1"
                  className="input-compact"
                  value={bulkCapacityAmount}
                  onChange={(e) => setBulkCapacityAmount(e.target.value)}
                />
              </label>
              <Button icon={PlusIcon} onClick={handleBulkAddCapacity}>
                {t("addCapacityButton")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isEditing && (
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
              <th>{t("colTitle")}</th>
              {isMultiroom && <th>{t("colRoom")}</th>}
              <th>{t("colDate")}</th>
              <th>{t("colSchedule")}</th>
              <th>{t("colCapacity")}</th>
              <th>{t("colActive")}</th>
              {showPending && <th>{t("colPending")}</th>}
              <th>{t("colConfirmed")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleSessions.map((session) => (
              <Fragment key={session.id}>
                <tr
                  className={[
                    session.is_active ? "" : "row-inactive",
                    isExpiredSession(session) ? "row-expired" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(session.id)}
                      onChange={() => toggleSelected(session.id)}
                    />
                  </td>
                  <td>{session.title || <em>{t("noTitle")}</em>}</td>
                  {isMultiroom && <td>{session.room_name}</td>}
                  <td>{session.date}</td>
                  <td>
                    {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
                  </td>
                  <td>{session.capacity}</td>
                  <td>{session.is_active ? t("yes") : t("no")}</td>
                  {showPending && <td>{session.pending_count ?? 0}</td>}
                  <td>{session.confirmed_count ?? 0}</td>
                  <td>
                    <div className="table-actions">
                      <Button icon={PencilIcon} onClick={() => handleEdit(session)}>
                        {t("editButton")}
                      </Button>
                      <Button icon={PowerIcon} onClick={() => handleToggleActive(session)}>
                        {session.is_active ? t("deactivateButton") : t("activateButton")}
                      </Button>
                      <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(session.id)}>
                        {t("deleteButton")}
                      </Button>
                      <Button
                        icon={ChevronDownIcon}
                        expanded={expandedId === session.id}
                        onClick={() => toggleReservations(session.id)}
                      >
                        {expandedId === session.id ? t("hideReservationsButton") : t("showReservationsButton")}
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
                <td colSpan={columnCount}>{t("noSessionsConfigured")}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
