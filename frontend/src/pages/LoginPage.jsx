import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { LogInIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const buildDate = new Date(__BUILD_DATE__).toLocaleString("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("usuari");
  const [entityCode, setEntityCode] = useState("demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, entityCode: entityCode.trim() || null, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Error d'inici de sessió");
    }
  }

  return (
    <div className="login-page">
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Codi d'entitat
          <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
        </label>
        <label>
          Nom d'usuari
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contrasenya
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <Button type="submit" icon={LogInIcon} variant="primary">
          Entrar
        </Button>
      </form>
      <p className="build-info">
        Versió {__APP_VERSION__} · Desplegat el {buildDate}
      </p>
    </div>
  );
}
