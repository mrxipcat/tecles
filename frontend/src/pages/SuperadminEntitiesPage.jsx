import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { ChevronDownIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "../components/icons.jsx";
import SuperadminEntityAdminsPanel from "../components/SuperadminEntityAdminsPanel.jsx";

const ALIAS_LANGUAGES = ["ca", "es", "en"];

const EMPTY_FORM = {
  name: "",
  code: "",
  slot_label_singular: { ca: "Sessió", es: "", en: "" },
  slot_label_plural: { ca: "Sessions", es: "", en: "" },
};

function AliasFieldsTable({ values, onChange }) {
  const { t } = useTranslation("superadminEntities");
  return (
    <table className="alias-table">
      <thead>
        <tr>
          <th>{t("page.aliasLanguageHeader")}</th>
          <th>{t("page.aliasSingularHeader")}</th>
          <th>{t("page.aliasPluralHeader")}</th>
        </tr>
      </thead>
      <tbody>
        {ALIAS_LANGUAGES.map((lang) => (
          <tr key={lang}>
            <td>{t(`page.aliasLanguage.${lang}`)}</td>
            <td>
              <input
                value={values.slot_label_singular[lang] ?? ""}
                onChange={(e) => onChange("slot_label_singular", lang, e.target.value)}
                required={lang === "ca"}
              />
            </td>
            <td>
              <input
                value={values.slot_label_plural[lang] ?? ""}
                onChange={(e) => onChange("slot_label_plural", lang, e.target.value)}
                required={lang === "ca"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function normalizeAliasField(field) {
  return { ca: field?.ca ?? "", es: field?.es ?? "", en: field?.en ?? "" };
}

function entityToEditForm(entity) {
  return {
    name: entity.name,
    code: entity.code,
    slot_label_singular: normalizeAliasField(entity.slot_label_singular),
    slot_label_plural: normalizeAliasField(entity.slot_label_plural),
  };
}

export default function SuperadminEntitiesPage() {
  const { t } = useTranslation("superadminEntities");
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    const { data } = await client.get("/superadmin/entities");
    setEntities(data);
  }

  useEffect(() => {
    load();
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAliasChange(field, lang, value) {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
  }

  function handleNew() {
    setError(null);
    setEditingId(null);
    setEditForm(null);
    setForm(EMPTY_FORM);
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleEditAliasChange(field, lang, value) {
    setEditForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
  }

  function handleStartEdit(entity) {
    setError(null);
    setForm(null);
    setEditingId(entity.id);
    setEditForm(entityToEditForm(entity));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await client.patch(`/superadmin/entities/${editingId}`, editForm);
      setEditingId(null);
      setEditForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("page.saveError"));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await client.post("/superadmin/entities", form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("page.createError"));
    }
  }

  async function handleDelete(entityId) {
    setError(null);
    try {
      await client.delete(`/superadmin/entities/${entityId}`);
      if (expandedId === entityId) setExpandedId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || t("page.deleteError"));
    }
  }

  function toggleAdmins(entityId) {
    setExpandedId((prev) => (prev === entityId ? null : entityId));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("page.title")}</h1>
        {!form && (
          <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
            {t("page.newEntity")}
          </Button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{t("page.newEntity")}</h2>
          <label>
            {t("page.nameLabel")}
            <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </label>
          <label>
            {t("page.codeLabel")}
            <input value={form.code} onChange={(e) => handleChange("code", e.target.value)} required />
          </label>
          <AliasFieldsTable values={form} onChange={handleAliasChange} />
          <div className="admin-form-actions">
            <Button type="submit" icon={PlusIcon} variant="primary">
              {t("common.create")}
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              {t("page.close")}
            </Button>
          </div>
        </form>
      )}

      {editForm && (
        <form className="admin-form" onSubmit={handleEditSubmit}>
          <h2>{t("page.editEntityHeading")}</h2>
          <label>
            {t("page.nameLabel")}
            <input value={editForm.name} onChange={(e) => handleEditChange("name", e.target.value)} required />
          </label>
          <label>
            {t("page.codeLabel")}
            <input value={editForm.code} onChange={(e) => handleEditChange("code", e.target.value)} required />
          </label>
          <AliasFieldsTable values={editForm} onChange={handleEditAliasChange} />
          <div className="admin-form-actions">
            <Button type="submit" icon={SaveIcon} variant="primary">
              {t("page.save")}
            </Button>
            <Button
              icon={XIcon}
              onClick={() => {
                setEditingId(null);
                setEditForm(null);
              }}
            >
              {t("page.close")}
            </Button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>{t("page.nameLabel")}</th>
            <th>{t("page.codeLabel")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entities.map((e) => (
            <Fragment key={e.id}>
              <tr>
                <td>{e.name}</td>
                <td>{e.code}</td>
                <td>
                  <div className="table-actions">
                    <Button icon={PencilIcon} onClick={() => handleStartEdit(e)}>
                      {t("page.edit")}
                    </Button>
                    <Button
                      icon={ChevronDownIcon}
                      expanded={expandedId === e.id}
                      onClick={() => toggleAdmins(e.id)}
                    >
                      {expandedId === e.id ? t("page.hideAdmins") : t("page.manageAdmins")}
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(e.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
              {expandedId === e.id && (
                <tr>
                  <td colSpan={3}>
                    <SuperadminEntityAdminsPanel entityId={e.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {entities.length === 0 && (
            <tr>
              <td colSpan={3}>{t("page.noEntities")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
