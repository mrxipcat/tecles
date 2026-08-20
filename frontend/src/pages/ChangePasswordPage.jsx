import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePasswordPage() {
  const { changePassword, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Les contrasenyes noves no coincideixen.");
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "No s'ha pogut canviar la contrasenya.");
    }
  }

  return (
    <div className="login-page">
      <h1>Canviar contrasenya</h1>
      {mustChangePassword && <p className="login-warning">Cal que canviïs la contrasenya abans de continuar.</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Contrasenya actual
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Contrasenya nova
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label>
          Repeteix la contrasenya nova
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Desar</button>
      </form>
    </div>
  );
}
