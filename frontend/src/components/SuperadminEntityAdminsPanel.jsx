import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "./Button.jsx";
import { CheckIcon, KeyIcon, PlusIcon, TrashIcon, XIcon } from "./icons.jsx";

const EMPTY_FORM = { username: "", full_name: "", initial_password: "" };

export default function SuperadminEntityAdminsPanel({ entityId }) {
  const { t } = useTranslation("superadminEntities");
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data } = await client.get(`/superadmin/entities/${entityId}/admins`);
    setAdmins(data);
  }, [entityId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await client.post(`/superadmin/entities/${entityId}/admins`, form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("adminsPanel.createError"));
    }
  }

  async function handleDelete(userId) {
    setError(null);
    try {
      await client.delete(`/superadmin/admins/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("adminsPanel.deleteError"));
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
      await client.post(`/superadmin/admins/${userId}/reset-password`, { new_password: resetPassword });
      setResetId(null);
      setResetPassword("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("adminsPanel.resetError"));
    }
  }

  return (
    <div className="reservations-panel">
      {error && <p className="error">{error}</p>}
      <h4>{t("adminsPanel.heading")}</h4>
      <table>
        <thead>
          <tr>
            <th>{t("adminsPanel.usernameLabel")}</th>
            <th>{t("adminsPanel.fullNameLabel")}</th>
            <th>{t("adminsPanel.mustChangePasswordHeader")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <Fragment key={admin.id}>
              <tr>
                <td>{admin.username}</td>
                <td>{admin.full_name}</td>
                <td>{admin.must_change_password ? t("adminsPanel.yes") : t("adminsPanel.no")}</td>
                <td>
                  <div className="table-actions">
                    <Button icon={KeyIcon} onClick={() => handleResetToggle(admin.id)}>
                      {t("adminsPanel.resetPassword")}
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(admin.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
              {resetId === admin.id && (
                <tr>
                  <td colSpan={4}>
                    <form className="inline-form" onSubmit={(e) => handleResetSubmit(e, admin.id)}>
                      <label>
                        {t("adminsPanel.newPasswordLabel")}
                        <input
                          type="text"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          required
                        />
                      </label>
                      <Button type="submit" icon={CheckIcon} variant="primary">
                        {t("adminsPanel.confirm")}
                      </Button>
                      <Button icon={XIcon} onClick={() => setResetId(null)}>
                        {t("adminsPanel.cancel")}
                      </Button>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {admins.length === 0 && (
            <tr>
              <td colSpan={4}>{t("adminsPanel.noAdmins")}</td>
            </tr>
          )}
        </tbody>
      </table>

      {form ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            {t("adminsPanel.usernameLabel")}
            <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} required />
          </label>
          <label>
            {t("adminsPanel.fullNameLabel")}
            <input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
          </label>
          <label>
            {t("adminsPanel.initialPasswordLabel")}
            <input
              type="text"
              value={form.initial_password}
              onChange={(e) => handleChange("initial_password", e.target.value)}
              required
            />
          </label>
          <Button type="submit" icon={PlusIcon} variant="primary">
            {t("common.create")}
          </Button>
          <Button icon={XIcon} onClick={() => setForm(null)}>
            {t("adminsPanel.cancel")}
          </Button>
        </form>
      ) : (
        <Button icon={PlusIcon} variant="primary" onClick={() => setForm(EMPTY_FORM)}>
          {t("adminsPanel.newAdmin")}
        </Button>
      )}
    </div>
  );
}
