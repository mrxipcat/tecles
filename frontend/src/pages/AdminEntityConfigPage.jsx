import { useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminEntityConfigPage() {
  const { user, setEntity: setAuthEntity } = useAuth();
  const [entity, setEntity] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.get(`/entities/${user.entity_id}`).then(({ data }) => setEntity(data));
  }, [user.entity_id]);

  function handleChange(field, value) {
    setEntity((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      name: entity.name,
      slot_label_singular: entity.slot_label_singular,
      slot_label_plural: entity.slot_label_plural,
      room_label_singular: entity.room_label_singular,
      room_label_plural: entity.room_label_plural,
      max_reservations_per_day: entity.max_reservations_per_day || null,
      max_reservations_per_week: entity.max_reservations_per_week || null,
      max_reservations_per_month: entity.max_reservations_per_month || null,
      visibility_mode: entity.visibility_mode,
      show_available_places: entity.show_available_places,
      auto_confirm_reservations: entity.auto_confirm_reservations,
      is_multiroom: entity.is_multiroom,
    };
    const { data } = await client.patch(`/entities/${entity.id}`, payload);
    setEntity(data);
    setAuthEntity(data);
    setSaved(true);
  }

  if (!entity) {
    return <p>Carregant...</p>;
  }

  return (
    <div className="page">
      <h1>Configuració de l'entitat</h1>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Nom de l'entitat
          <input value={entity.name} onChange={(e) => handleChange("name", e.target.value)} />
        </label>
        <label>
          Nom en singular (p. ex. "Sessió", "Aula", "Sala")
          <input
            value={entity.slot_label_singular}
            onChange={(e) => handleChange("slot_label_singular", e.target.value)}
          />
        </label>
        <label>
          Nom en plural (p. ex. "Sessions", "Aules", "Sales")
          <input
            value={entity.slot_label_plural}
            onChange={(e) => handleChange("slot_label_plural", e.target.value)}
          />
        </label>
        <label>
          Nom de la sala en singular (p. ex. "Sala", "Aula", "Despatx")
          <input
            value={entity.room_label_singular}
            onChange={(e) => handleChange("room_label_singular", e.target.value)}
          />
        </label>
        <label>
          Nom de la sala en plural (p. ex. "Sales", "Aules", "Despatxos")
          <input
            value={entity.room_label_plural}
            onChange={(e) => handleChange("room_label_plural", e.target.value)}
          />
        </label>
        <label>
          Màxim de reserves per dia
          <input
            type="number"
            min="0"
            value={entity.max_reservations_per_day ?? ""}
            onChange={(e) => handleChange("max_reservations_per_day", e.target.value)}
          />
        </label>
        <label>
          Màxim de reserves per setmana
          <input
            type="number"
            min="0"
            value={entity.max_reservations_per_week ?? ""}
            onChange={(e) => handleChange("max_reservations_per_week", e.target.value)}
          />
        </label>
        <label>
          Màxim de reserves per mes
          <input
            type="number"
            min="0"
            value={entity.max_reservations_per_month ?? ""}
            onChange={(e) => handleChange("max_reservations_per_month", e.target.value)}
          />
        </label>
        <label>
          Visibilitat de l'oferta
          <select value={entity.visibility_mode} onChange={(e) => handleChange("visibility_mode", e.target.value)}>
            <option value="always">Sempre visibles</option>
            <option value="available_only">Només si hi ha places disponibles</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={entity.show_available_places}
            onChange={(e) => handleChange("show_available_places", e.target.checked)}
          />
          Mostrar les places lliures als usuaris
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={entity.auto_confirm_reservations}
            onChange={(e) => handleChange("auto_confirm_reservations", e.target.checked)}
          />
          Confirmar les sol·licituds de reserva automàticament
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={entity.is_multiroom}
            onChange={(e) => handleChange("is_multiroom", e.target.checked)}
          />
          Multisala (diverses {entity.room_label_plural.toLowerCase()})
        </label>
        {/* TODO(sprint3): els límits max_reservations_per_* encara no s'apliquen a la lògica de reserves. */}
        <button type="submit">Desar</button>
        {saved && <span className="info">Desat correctament.</span>}
      </form>
    </div>
  );
}
