import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { LogInIcon } from "../components/icons.jsx";
import { useAuth, LOGOUT_ENTITY_CODE_KEY } from "../context/AuthContext.jsx";

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
  const usernameInputRef = useRef(null);
  const [username, setUsername] = useState("usuari");
  const [entityCode, setEntityCode] = useState(() => {
    if (fixedEntityCode) return fixedEntityCode;
    return sessionStorage.getItem(LOGOUT_ENTITY_CODE_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [entityName, setEntityName] = useState(null);
  const [connectingToServer, setConnectingToServer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client
      .get("/health")
      .catch(() => {})
      .finally(() => setConnectingToServer(false));
  }, []);

  useEffect(() => {
    if (fixedEntityCode || !sessionStorage.getItem(LOGOUT_ENTITY_CODE_KEY)) return;
    sessionStorage.removeItem(LOGOUT_ENTITY_CODE_KEY);
    usernameInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!submitting) return;
    document.body.classList.add("app-busy");
    return () => document.body.classList.remove("app-busy");
  }, [submitting]);

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
    setSubmitting(true);
    try {
      await login({ username, entityCode: entityCode.trim() || null, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || t("genericError"));
    } finally {
      setSubmitting(false);
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
          <input ref={usernameInputRef} value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          {t("password")}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        {connectingToServer && <p className="info">{t("connectingToServer")}</p>}
        <Button type="submit" icon={LogInIcon} variant="primary" disabled={connectingToServer || submitting}>
          {t("submit")}
        </Button>
      </form>
      <p className="build-info">{t("buildInfo", { version: __APP_VERSION__, date: buildDate })}</p>
    </div>
  );
}
