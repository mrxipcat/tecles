import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const { user, updateLanguage } = useAuth();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleLanguageChange(e) {
    setError(null);
    setMessage(null);
    try {
      await updateLanguage(e.target.value || null);
      setMessage(t("languageUpdated"));
    } catch (err) {
      setError(err.response?.data?.detail || t("languageError"));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("title")}</h1>
      </div>

      <section className="admin-form">
        <h2>{t("accountTitle")}</h2>
        <p>
          <strong>{t("username")}:</strong> {user.username}
        </p>
        <p>
          <strong>{t("fullName")}:</strong> {user.full_name || "—"}
        </p>
        <p>
          <strong>{t("email")}:</strong> {user.email || "—"}
        </p>
      </section>

      <section className="admin-form">
        <h2>{t("languageTitle")}</h2>
        <p className="info">{t("languageHint")}</p>
        <label>
          {t("languageLabel")}
          <select value={user.language || ""} onChange={handleLanguageChange}>
            <option value="">{t("languageAuto")}</option>
            <option value="ca">{t("languageCa")}</option>
            <option value="es">{t("languageEs")}</option>
            <option value="en">{t("languageEn")}</option>
          </select>
        </label>
        {message && <p className="info">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="admin-form">
        <h2>{t("securityTitle")}</h2>
        <Link to="/canviar-contrasenya">{t("changePassword")}</Link>
      </section>
    </div>
  );
}
