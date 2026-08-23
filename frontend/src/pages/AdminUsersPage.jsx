import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import {
  CalendarXIcon,
  CheckIcon,
  ChevronDownIcon,
  KeyIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "../components/icons.jsx";
import UserReservationsPanel from "../components/UserReservationsPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = {
  id: null,
  username: "",
  full_name: "",
  email: "",
  role: "user",
  initial_password: "",
  is_active: true,
  visible_room_ids: [],
};

export default function AdminUsersPage() {
  const { t } = useTranslation("adminUsers");
  const { user, entity } = useAuth();
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [bulkRoomId, setBulkRoomId] = useState("");
  const [error, setError] = useState(null);
  const isMultiroom = Boolean(entity?.is_multiroom);
  const columnCount = 8 + (isMultiroom ? 1 : 0);

  async function load() {
    const { data } = await client.get("/users");
    setUsers(data);
  }

  useEffect(() => {
    load();
  }, []);

  // Manté seleccionats només els usuaris que continuen existint després de recarregar.
  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (users.some((u) => u.id === id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [users]);

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

  function toggleReservations(userId) {
    setExpandedId((prev) => (prev === userId ? null : userId));
  }

  function toggleSelected(userId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    const selectableIds = users.filter((u) => u.id !== user.id).map((u) => u.id);
    setSelectedIds((prev) => (prev.size === selectableIds.length ? new Set() : new Set(selectableIds)));
  }

  function handleNew() {
    setError(null);
    setForm(EMPTY_FORM);
  }

  function handleEdit(target) {
    setError(null);
    setSelectedIds(new Set());
    setForm({
      id: target.id,
      username: target.username,
      full_name: target.full_name || "",
      email: target.email || "",
      role: target.role,
      is_active: target.is_active,
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
          is_active: form.is_active,
          visible_room_ids: form.visible_room_ids,
        });
      } else {
        await client.post("/users", {
          username: form.username,
          full_name: form.full_name,
          email: form.email || null,
          role: form.role,
          initial_password: form.initial_password,
          is_active: form.is_active,
          visible_room_ids: form.visible_room_ids,
        });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.saveUser"));
    }
  }

  async function handleDelete(userId) {
    setError(null);
    try {
      await client.delete(`/users/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.deleteUser"));
    }
  }

  async function handleToggleActive(target) {
    setError(null);
    try {
      await client.patch(`/users/${target.id}`, { is_active: !target.is_active });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.updateUser"));
    }
  }

  async function handleBulkSetActive(isActive) {
    setError(null);
    try {
      await client.patch("/users/bulk-active", { user_ids: [...selectedIds], is_active: isActive });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.bulkUpdateUsers"));
    }
  }

  async function handleBulkCancelReservations() {
    if (!window.confirm(t("confirms.bulkCancelReservations"))) {
      return;
    }
    setError(null);
    try {
      await client.patch("/reservations/bulk-cancel-by-user", { user_ids: [...selectedIds] });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.bulkCancelReservations"));
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(t("confirms.bulkDelete", { count: selectedIds.size }))) {
      return;
    }
    setError(null);
    try {
      await client.delete("/users/bulk", { data: { user_ids: [...selectedIds] } });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.bulkDeleteUsers"));
    }
  }

  async function handleBulkAddRoom() {
    if (!bulkRoomId) return;
    setError(null);
    try {
      await client.patch("/users/bulk-add-room", { user_ids: [...selectedIds], room_id: Number(bulkRoomId) });
      setBulkRoomId("");
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.addRoom"));
    }
  }

  async function handleBulkRemoveRoom() {
    if (!bulkRoomId) return;
    const roomName = rooms.find((room) => room.id === Number(bulkRoomId))?.name || t("confirms.defaultRoomName");
    if (!window.confirm(t("confirms.bulkRemoveRoom", { roomName }))) {
      return;
    }
    setError(null);
    try {
      await client.patch("/users/bulk-remove-room", { user_ids: [...selectedIds], room_id: Number(bulkRoomId) });
      setBulkRoomId("");
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errors.removeRoom"));
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
      setError(err.response?.data?.detail || t("errors.resetPassword"));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("title")}</h1>
        {!form && (
          <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
            {t("newUser")}
          </Button>
        )}
      </div>

      {!form && error && <p className="error">{error}</p>}

      {form && (
        <Fragment>
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? t("form.editTitle") : t("form.newTitle")}</h2>
          <label>
            {t("form.username")}
            <input
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              disabled={Boolean(form.id)}
              required
            />
          </label>
          <label>
            {t("form.fullName")}
            <input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
          </label>
          <label>
            {t("form.email")}
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </label>
          <label>
            {t("form.role")}
            <select value={form.role} onChange={(e) => handleChange("role", e.target.value)}>
              <option value="user">{t("form.roleUser")}</option>
              <option value="admin">{t("form.roleAdmin")}</option>
            </select>
          </label>
          {isMultiroom && form.role === "user" && (
            <label>
              {t("form.visibleRooms")}
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
              {t("form.initialPassword")}
              <input
                type="text"
                value={form.initial_password}
                onChange={(e) => handleChange("initial_password", e.target.value)}
                required
              />
            </label>
          )}
          {!form.id && <p className="info">{t("form.initialPasswordInfo")}</p>}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={form.id === user.id}
              onChange={(e) => handleChange("is_active", e.target.checked)}
            />
            {t("form.active")}
          </label>
          <div className="admin-form-actions">
            <Button type="submit" icon={form.id ? SaveIcon : PlusIcon} variant="primary">
              {form.id ? t("form.saveChanges") : t("form.create")}
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              {t("form.close")}
            </Button>
          </div>
        </form>
        {form.id && entity && (
          <div className="admin-form-reservations">
            <h3>{t("reservationsSection.title")}</h3>
            <UserReservationsPanel
              userId={form.id}
              autoConfirm={entity.auto_confirm_reservations}
              onChanged={load}
            />
          </div>
        )}
        </Fragment>
      )}

      {!form && selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <h3>{t("bulk.title", { count: selectedIds.size })}</h3>
          <div className="table-actions">
            <Button icon={CheckIcon} variant="primary" onClick={() => handleBulkSetActive(true)}>
              {t("bulk.activate")}
            </Button>
            <Button icon={XIcon} onClick={() => handleBulkSetActive(false)}>
              {t("bulk.deactivate")}
            </Button>
            <Button icon={CalendarXIcon} onClick={handleBulkCancelReservations}>
              {t("bulk.cancelReservations")}
            </Button>
            <Button icon={TrashIcon} variant="danger" onClick={handleBulkDelete}>
              {t("bulk.deleteUsers")}
            </Button>
          </div>
          {isMultiroom && (
            <div className="table-actions">
              <div className="inline-form">
                <label>
                  {t("bulk.group")}
                  <select value={bulkRoomId} onChange={(e) => setBulkRoomId(e.target.value)}>
                    <option value="">{t("bulk.selectGroup")}</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button icon={PlusIcon} onClick={handleBulkAddRoom} disabled={!bulkRoomId}>
                  {t("bulk.addToGroup")}
                </Button>
                <Button icon={XIcon} onClick={handleBulkRemoveRoom} disabled={!bulkRoomId}>
                  {t("bulk.removeFromGroup")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!form && (
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    users.some((u) => u.id !== user.id) &&
                    selectedIds.size === users.filter((u) => u.id !== user.id).length
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th>{t("table.user")}</th>
              <th>{t("table.fullName")}</th>
              <th>{t("table.email")}</th>
              <th>{t("table.role")}</th>
              {isMultiroom && <th>{t("table.visibleRooms")}</th>}
              <th>{t("table.active")}</th>
              <th>{t("table.mustChangePassword")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr className={u.is_active ? "" : "row-inactive"}>
                  <td>
                    {u.id !== user.id && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelected(u.id)}
                      />
                    )}
                  </td>
                  <td>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.role === "admin" ? t("form.roleAdmin") : t("form.roleUser")}</td>
                  {isMultiroom && (
                    <td>{u.role === "user" ? u.visible_room_names.join(", ") || t("table.allRooms") : "—"}</td>
                  )}
                  <td>{u.is_active ? t("table.yes") : t("table.no")}</td>
                  <td>{u.must_change_password ? t("table.yes") : t("table.no")}</td>
                  <td>
                    <div className="table-actions">
                      <Button icon={PencilIcon} onClick={() => handleEdit(u)}>
                        {t("actions.edit")}
                      </Button>
                      <Button icon={KeyIcon} onClick={() => handleResetToggle(u.id)}>
                        {t("actions.resetPassword")}
                      </Button>
                      {u.id !== user.id && (
                        <Button icon={PowerIcon} onClick={() => handleToggleActive(u)}>
                          {u.is_active ? t("actions.deactivate") : t("actions.activate")}
                        </Button>
                      )}
                      <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(u.id)}>
                        {t("actions.delete")}
                      </Button>
                      <Button
                        icon={ChevronDownIcon}
                        expanded={expandedId === u.id}
                        onClick={() => toggleReservations(u.id)}
                      >
                        {expandedId === u.id ? t("actions.hideReservations") : t("actions.viewReservations")}
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedId === u.id && entity && (
                  <tr>
                    <td colSpan={columnCount}>
                      <UserReservationsPanel
                        userId={u.id}
                        autoConfirm={entity.auto_confirm_reservations}
                        onChanged={load}
                      />
                    </td>
                  </tr>
                )}
                {resetId === u.id && (
                  <tr>
                    <td colSpan={columnCount}>
                      <form className="inline-form" onSubmit={(e) => handleResetSubmit(e, u.id)}>
                        <label>
                          {t("resetForm.newPassword")}
                          <input
                            type="text"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            required
                          />
                        </label>
                        <Button type="submit" icon={CheckIcon} variant="primary">
                          {t("resetForm.confirm")}
                        </Button>
                        <Button icon={XIcon} onClick={() => setResetId(null)}>
                          {t("resetForm.cancel")}
                        </Button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={columnCount}>{t("empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
