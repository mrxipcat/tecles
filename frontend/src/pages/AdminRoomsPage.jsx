import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = { id: null, name: "" };

export default function AdminRoomsPage() {
  const { t } = useTranslation("adminRooms");
  const { user, entity } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

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
      setError(err.response?.data?.detail || t("errorSaveFailed"));
    }
  }

  async function handleDelete(roomId) {
    setError(null);
    try {
      await client.delete(`/rooms/${roomId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("errorDeleteFailed"));
    }
  }

  if (entity && !entity.is_multiroom) {
    return (
      <div className="page">
        <h1>{t("pageHeading")}</h1>
        <p>{t("multiroomDisabledMessage")}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("adminHeading")}</h1>
        {!form && (
          <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
            {t("newRoomButton")}
          </Button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? t("editRoomHeading") : t("newRoomHeading")}</h2>
          <label>
            {t("nameLabel")}
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>
          <div className="admin-form-actions">
            <Button type="submit" icon={form.id ? SaveIcon : PlusIcon} variant="primary">
              {form.id ? t("saveChangesButton") : t("createButton")}
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              {t("closeButton")}
            </Button>
          </div>
        </form>
      )}

      {!form && (
        <table>
          <thead>
            <tr>
              <th>{t("tableNameHeader")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.name}</td>
                <td>
                  <div className="table-actions">
                    <Button icon={PencilIcon} onClick={() => handleEdit(room)}>
                      {t("editButton")}
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(room.id)}>
                      {t("deleteButton")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={2}>{t("emptyState")}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
