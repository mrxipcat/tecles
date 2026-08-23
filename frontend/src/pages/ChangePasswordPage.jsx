import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/Button.jsx";
import { SaveIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChangePasswordPage() {
  const { t } = useTranslation("changePassword");
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
      setError(t("mismatchError"));
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || t("genericError"));
    }
  }

  return (
    <div className="login-page">
      <h1>{t("title")}</h1>
      {mustChangePassword && <p className="login-warning">{t("mustChangeWarning")}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          {t("currentPassword")}
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          {t("newPassword")}
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label>
          {t("confirmPassword")}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <Button type="submit" icon={SaveIcon} variant="primary">
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
