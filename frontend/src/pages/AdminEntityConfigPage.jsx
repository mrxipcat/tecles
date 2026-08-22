import { useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { MailIcon, SaveIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_EMAIL_CONFIG = {
  smtp_host: "",
  smtp_port: "",
  smtp_username: "",
  smtp_from_email: "",
  smtp_use_tls: true,
  smtp_password_set: false,
  email_signature: "",
};

export default function AdminEntityConfigPage() {
  const { user, setEntity: setAuthEntity } = useAuth();
  const [entity, setEntity] = useState(null);
  const [saved, setSaved] = useState(false);
  const [emailConfig, setEmailConfig] = useState(EMPTY_EMAIL_CONFIG);
  const [smtpPasswordInput, setSmtpPasswordInput] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user.email || "");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    client.get(`/entities/${user.entity_id}`).then(({ data }) => setEntity(data));
    client.get(`/entities/${user.entity_id}/email-config`).then(({ data }) => setEmailConfig(data));
  }, [user.entity_id]);

  function handleChange(field, value) {
    setEntity((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleEmailConfigChange(field, value) {
    setEmailConfig((prev) => ({ ...prev, [field]: value }));
    setEmailSaved(false);
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

  async function handleEmailConfigSubmit(event) {
    event.preventDefault();
    const payload = {
      smtp_host: emailConfig.smtp_host || null,
      smtp_port: emailConfig.smtp_port ? Number(emailConfig.smtp_port) : null,
      smtp_username: emailConfig.smtp_username || null,
      smtp_from_email: emailConfig.smtp_from_email || null,
      smtp_use_tls: emailConfig.smtp_use_tls,
      email_signature: emailConfig.email_signature || null,
    };
    if (smtpPasswordInput) {
      payload.smtp_password = smtpPasswordInput;
    }
    const { data } = await client.patch(`/entities/${user.entity_id}/email-config`, payload);
    setEmailConfig(data);
    setSmtpPasswordInput("");
    setEmailSaved(true);
  }

  async function handleTestEmail(event) {
    event.preventDefault();
    setTestSending(true);
    setTestResult(null);
    try {
      const { data } = await client.post(`/entities/${user.entity_id}/email-config/test`, {
        to_email: testEmailAddress,
      });
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        detail: err.response?.data?.detail || "No s'ha pogut enviar el correu de prova.",
      });
    } finally {
      setTestSending(false);
    }
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
          Mode multigrup
        </label>
        {/* TODO(sprint3): els límits max_reservations_per_* encara no s'apliquen a la lògica de reserves. */}
        <Button type="submit" icon={SaveIcon} variant="primary">
          Desar
        </Button>
        {saved && <span className="info">Desat correctament.</span>}
      </form>

      <h2>Notificacions per correu</h2>
      <form className="admin-form" onSubmit={handleEmailConfigSubmit}>
        <label>
          Servidor SMTP
          <input
            value={emailConfig.smtp_host ?? ""}
            onChange={(e) => handleEmailConfigChange("smtp_host", e.target.value)}
            placeholder="smtp.exemple.com"
          />
        </label>
        <label>
          Port
          <input
            type="number"
            min="0"
            value={emailConfig.smtp_port ?? ""}
            onChange={(e) => handleEmailConfigChange("smtp_port", e.target.value)}
            placeholder="587"
          />
        </label>
        <label>
          Usuari
          <input
            value={emailConfig.smtp_username ?? ""}
            onChange={(e) => handleEmailConfigChange("smtp_username", e.target.value)}
          />
        </label>
        <label>
          Contrasenya
          <input
            type="password"
            value={smtpPasswordInput}
            onChange={(e) => setSmtpPasswordInput(e.target.value)}
            placeholder={emailConfig.smtp_password_set ? "Configurada (deixa-ho en blanc per no canviar-la)" : ""}
          />
        </label>
        <label>
          Adreça del remitent
          <input
            type="email"
            value={emailConfig.smtp_from_email ?? ""}
            onChange={(e) => handleEmailConfigChange("smtp_from_email", e.target.value)}
            placeholder="notificacions@exemple.com"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={emailConfig.smtp_use_tls}
            onChange={(e) => handleEmailConfigChange("smtp_use_tls", e.target.checked)}
          />
          Usar TLS
        </label>
        <label>
          Signatura / peu dels correus
          <RichTextEditor
            value={emailConfig.email_signature}
            onChange={(html) => handleEmailConfigChange("email_signature", html)}
            placeholder="S'afegirà al final de tots els correus enviats des del portal"
          />
        </label>
        <Button type="submit" icon={SaveIcon} variant="primary">
          Desar
        </Button>
        {emailSaved && <span className="info">Desat correctament.</span>}
      </form>

      <form className="admin-form" onSubmit={handleTestEmail}>
        <label>
          Enviar un correu de prova a
          <input
            type="email"
            required
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="tu@exemple.com"
          />
        </label>
        <Button type="submit" icon={MailIcon} disabled={testSending}>
          {testSending ? "Enviant..." : "Enviar prova"}
        </Button>
        {testResult && (
          <span className={testResult.success ? "info" : "error"}>{testResult.detail}</span>
        )}
      </form>
    </div>
  );
}
