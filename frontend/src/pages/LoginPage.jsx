import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("usuari");
  const [entityCode, setEntityCode] = useState("demo");
  const [password, setPassword] = useState("");
  const [isSuperadminLogin, setIsSuperadminLogin] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, entityCode: isSuperadminLogin ? null : entityCode, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Error d'inici de sessió");
    }
  }

  return (
    <div className="login-page">
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isSuperadminLogin}
            onChange={(e) => setIsSuperadminLogin(e.target.checked)}
          />
          Accés de superadministrador (sense codi d'entitat)
        </label>
        {!isSuperadminLogin && (
          <label>
            Codi d'entitat
            <input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} required />
          </label>
        )}
        <label>
          Nom d'usuari
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contrasenya
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
