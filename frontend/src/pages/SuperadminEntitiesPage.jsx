import { Fragment, useEffect, useState } from "react";
import client from "../api/client.js";
import SuperadminEntityAdminsPanel from "../components/SuperadminEntityAdminsPanel.jsx";

const EMPTY_FORM = { name: "", code: "", slot_label_singular: "Sessió", slot_label_plural: "Sessions" };

export default function SuperadminEntitiesPage() {
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState(null);
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
    setForm(EMPTY_FORM);
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
        {!form && <button onClick={handleNew}>Nova entitat</button>}
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
          <label>
            Nom en singular
            <input
              value={form.slot_label_singular}
              onChange={(e) => handleChange("slot_label_singular", e.target.value)}
              required
            />
          </label>
          <label>
            Nom en plural
            <input
              value={form.slot_label_plural}
              onChange={(e) => handleChange("slot_label_plural", e.target.value)}
              required
            />
          </label>
          <div className="admin-form-actions">
            <button type="submit">Crear</button>
            <button type="button" onClick={() => setForm(null)}>
              Tancar
            </button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Codi</th>
            <th>Singular</th>
            <th>Plural</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entities.map((e) => (
            <Fragment key={e.id}>
              <tr>
                <td>{e.name}</td>
                <td>{e.code}</td>
                <td>{e.slot_label_singular}</td>
                <td>{e.slot_label_plural}</td>
                <td>
                  <button onClick={() => toggleAdmins(e.id)}>
                    {expandedId === e.id ? "Amagar admins" : "Gestionar admins"}
                  </button>
                  <button onClick={() => handleDelete(e.id)}>Esborrar</button>
                </td>
              </tr>
              {expandedId === e.id && (
                <tr>
                  <td colSpan={5}>
                    <SuperadminEntityAdminsPanel entityId={e.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {entities.length === 0 && (
            <tr>
              <td colSpan={5}>No hi ha entitats configurades.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
