import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { LogInIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const BUILD_LOCALES = { ca: "ca-ES", es: "es-ES", en: "en-GB" };

function entityCodeFromSubdomain() {
  const parts = window.location.hostname.split(".");
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (subdomain === "www") return null;
  return subdomain;
}

export default function LoginPage() {
  const { t, i18n } = useTranslation("login");
  const { login } = useAuth();
  const navigate = useNavigate();
  const fixedEntityCode = entityCodeFromSubdomain();
  const buildDate = new Date(__BUILD_DATE__).toLocaleString(BUILD_LOCALES[i18n.language] || "ca-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const [username, setUsername] = useState("usuari");
  const [entityCode, setEntityCode] = useState(fixedEntityCode || "demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [entityName, setEntityName] = useState(null);

  useEffect(() => {
    if (!fixedEntityCode) return;
    client
      .get(`/entities/by-code/${fixedEntityCode}`)
      .then((res) => setEntityName(res.data.name))
      .catch(() => setEntityName(null));
  }, [fixedEntityCode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, entityCode: entityCode.trim() || null, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || t("genericError"));
    }
  }

  return (
    <div className="login-page">
      <h1>{fixedEntityCode && entityName ? t("titleWithEntity", { entityName }) : t("title")}</h1>
      <form onSubmit={handleSubmit}>
        {!fixedEntityCode && (
          <label>
            {t("entityCode")}
            <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
          </label>
        )}
        <label>
          {t("username")}
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          {t("password")}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <Button type="submit" icon={LogInIcon} variant="primary">
          {t("submit")}
        </Button>
      </form>
      <p className="build-info">{t("buildInfo", { version: __APP_VERSION__, date: buildDate })}</p>
    </div>
  );
}
