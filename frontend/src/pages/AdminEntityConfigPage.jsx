import { useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { SaveIcon } from "../components/icons.jsx";
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
          Multi-{entity.room_label_singular}
        </label>
        {/* TODO(sprint3): els límits max_reservations_per_* encara no s'apliquen a la lògica de reserves. */}
        <Button type="submit" icon={SaveIcon} variant="primary">
          Desar
        </Button>
        {saved && <span className="info">Desat correctament.</span>}
      </form>
    </div>
  );
}
