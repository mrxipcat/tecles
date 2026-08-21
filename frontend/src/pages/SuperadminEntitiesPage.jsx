import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { ChevronDownIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "../components/icons.jsx";
import SuperadminEntityAdminsPanel from "../components/SuperadminEntityAdminsPanel.jsx";

const EMPTY_FORM = {
  name: "",
  code: "",
  slot_label_singular: "Sessió",
  slot_label_plural: "Sessions",
};

function AliasFieldsTable({ values, onChange }) {
  return (
    <table className="alias-table">
      <thead>
        <tr>
          <th></th>
          <th>Singular</th>
          <th>Plural</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Slot</td>
          <td>
            <input
              value={values.slot_label_singular}
              onChange={(e) => onChange("slot_label_singular", e.target.value)}
              required
            />
          </td>
          <td>
            <input
              value={values.slot_label_plural}
              onChange={(e) => onChange("slot_label_plural", e.target.value)}
              required
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function entityToEditForm(entity) {
  return {
    name: entity.name,
    code: entity.code,
    slot_label_singular: entity.slot_label_singular,
    slot_label_plural: entity.slot_label_plural,
  };
}

export default function SuperadminEntitiesPage() {
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

  function handleNew() {
    setError(null);
    setEditingId(null);
    setEditForm(null);
    setForm(EMPTY_FORM);
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
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
      setError(err.response?.data?.detail || "No s'ha pogut desar l'entitat.");
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
      setError(err.response?.data?.detail || "No s'ha pogut crear l'entitat.");
    }
  }

  async function handleDelete(entityId) {
    setError(null);
    try {
      await client.delete(`/superadmin/entities/${entityId}`);
      if (expandedId === entityId) setExpandedId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut eliminar l'entitat.");
    }
  }

  function toggleAdmins(entityId) {
    setExpandedId((prev) => (prev === entityId ? null : entityId));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Administració d'entitats</h1>
        {!form && (
          <Button icon={PlusIcon} variant="primary" onClick={handleNew}>
            Nova entitat
          </Button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>Nova entitat</h2>
          <label>
            Nom
            <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
          </label>
          <label>
            Codi
            <input value={form.code} onChange={(e) => handleChange("code", e.target.value)} required />
          </label>
          <AliasFieldsTable values={form} onChange={handleChange} />
          <div className="admin-form-actions">
            <Button type="submit" icon={PlusIcon} variant="primary">
              Crear
            </Button>
            <Button icon={XIcon} onClick={() => setForm(null)}>
              Tancar
            </Button>
          </div>
        </form>
      )}

      {editForm && (
        <form className="admin-form" onSubmit={handleEditSubmit}>
          <h2>Editar entitat</h2>
          <label>
            Nom
            <input value={editForm.name} onChange={(e) => handleEditChange("name", e.target.value)} required />
          </label>
          <label>
            Codi
            <input value={editForm.code} onChange={(e) => handleEditChange("code", e.target.value)} required />
          </label>
          <AliasFieldsTable values={editForm} onChange={handleEditChange} />
          <div className="admin-form-actions">
            <Button type="submit" icon={SaveIcon} variant="primary">
              Desar
            </Button>
            <Button
              icon={XIcon}
              onClick={() => {
                setEditingId(null);
                setEditForm(null);
              }}
            >
              Tancar
            </Button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Codi</th>
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
                      Editar
                    </Button>
                    <Button
                      icon={ChevronDownIcon}
                      expanded={expandedId === e.id}
                      onClick={() => toggleAdmins(e.id)}
                    >
                      {expandedId === e.id ? "Amagar admins" : "Gestionar admins"}
                    </Button>
                    <Button icon={TrashIcon} variant="danger" onClick={() => handleDelete(e.id)}>
                      Esborrar
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
              <td colSpan={3}>No hi ha entitats configurades.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
