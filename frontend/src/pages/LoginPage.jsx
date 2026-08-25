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

function entityCodeFromQuery() {
  return new URLSearchParams(window.location.search).get("entitat");
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
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [entityCode, setEntityCode] = useState(() => {
    if (fixedEntityCode) return fixedEntityCode;
    return entityCodeFromQuery() || sessionStorage.getItem(LOGOUT_ENTITY_CODE_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [entityName, setEntityName] = useState(null);
  const [entityAllowsRegistration, setEntityAllowsRegistration] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerError, setRegisterError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

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
    if (!submitting && !registerSubmitting) return;
    document.body.classList.add("app-busy");
    return () => document.body.classList.remove("app-busy");
  }, [submitting, registerSubmitting]);

  useEffect(() => {
    if (!fixedEntityCode || connectingToServer) return;
    client
      .get(`/entities/by-code/${fixedEntityCode}`)
      .then((res) => {
        setEntityName(res.data.name);
        setEntityAllowsRegistration(res.data.allow_self_registration);
      })
      .catch(() => {
        setEntityName(null);
        setEntityAllowsRegistration(false);
      });
  }, [fixedEntityCode, connectingToServer]);

  useEffect(() => {
    if (fixedEntityCode || connectingToServer) return;
    const code = entityCode.trim();
    if (!code) {
      setEntityName(null);
      setEntityAllowsRegistration(false);
      return;
    }
    const handle = setTimeout(() => {
      client
        .get(`/entities/by-code/${code}`)
        .then((res) => {
          setEntityName(res.data.name);
          setEntityAllowsRegistration(res.data.allow_self_registration);
        })
        .catch(() => {
          setEntityName(null);
          setEntityAllowsRegistration(false);
        });
    }, 400);
    return () => clearTimeout(handle);
  }, [entityCode, fixedEntityCode, connectingToServer]);

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

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setRegisterError(null);
    setRegisterSubmitting(true);
    try {
      const { data } = await client.post("/auth/register", {
        entity_code: entityCode.trim(),
        email: registerEmail.trim(),
        origin: window.location.origin,
      });
      setRegisterSuccess(data.detail);
    } catch (err) {
      setRegisterError(err.response?.data?.detail || t("selfRegisterGenericError"));
    } finally {
      setRegisterSubmitting(false);
    }
  }

  function backToLogin() {
    setMode("login");
    setRegisterEmail("");
    setRegisterError(null);
    setRegisterSuccess(null);
  }

  return (
    <div className="login-page">
      <h1>{entityName ? t("titleWithEntity", { entityName }) : t("title")}</h1>
      {mode === "login" ? (
        <form onSubmit={handleSubmit}>
          {!fixedEntityCode && (
            <label>
              {t("entityCode")}
              <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
            </label>
          )}
          {entityAllowsRegistration && (
            <Button className="self-register-button" onClick={() => setMode("register")}>
              {t("selfRegisterButton")}
            </Button>
          )}
          <div className="admin-form">
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
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegisterSubmit}>
          {!fixedEntityCode && (
            <label>
              {t("entityCode")}
              <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
            </label>
          )}
          <label>
            {t("selfRegisterEmailLabel")}
            <input
              type="email"
              required
              disabled={Boolean(registerSuccess)}
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
            />
          </label>
          {registerError && <p className="error">{registerError}</p>}
          {registerSuccess && <p className="info">{registerSuccess}</p>}
          <div className="admin-form-actions">
            {!registerSuccess && (
              <Button type="submit" variant="primary" disabled={registerSubmitting}>
                {t("selfRegisterSubmit")}
              </Button>
            )}
            <Button onClick={backToLogin}>{registerSuccess ? t("selfRegisterBackToLogin") : t("selfRegisterCancel")}</Button>
          </div>
        </form>
      )}
      <p className="build-info">{t("buildInfo", { version: __APP_VERSION__, date: buildDate })}</p>
    </div>
  );
}
