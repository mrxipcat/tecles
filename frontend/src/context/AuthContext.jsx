import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";
import i18n, { SUPPORTED_LANGUAGES } from "../i18n/index.js";

const STORAGE_KEY = "webaules_auth";
const AuthContext = createContext(null);

function loadStored() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function detectBrowserLanguage() {
  const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const short = candidate?.slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(short)) return short;
  }
  return "ca";
}

function resolveLanguage(user) {
  if (user?.language && SUPPORTED_LANGUAGES.includes(user.language)) return user.language;
  return detectBrowserLanguage();
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStored());
  const [entity, setEntity] = useState(null);

  useEffect(() => {
    if (!auth?.user?.entity_id) {
      setEntity(null);
      return;
    }
    client.get(`/entities/${auth.user.entity_id}`).then(({ data }) => setEntity(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.id]);

  useEffect(() => {
    i18n.changeLanguage(resolveLanguage(auth?.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.id, auth?.user?.language]);

  async function login({ username, entityCode, password }) {
    const { data } = await client.post("/auth/login", {
      username,
      entity_code: entityCode || null,
      password,
    });
    const nextAuth = { token: data.access_token, user: data.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }

  async function changePassword({ currentPassword, newPassword }) {
    const { data } = await client.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    const nextAuth = { token: auth.token, user: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }

  async function updateLanguage(language) {
    const { data } = await client.patch("/auth/me", { language });
    const nextAuth = { token: auth.token, user: data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    entity,
    setEntity,
    isAuthenticated: Boolean(auth?.token),
    isAdmin: auth?.user?.role === "admin",
    isSuperadmin: auth?.user?.role === "superadmin",
    mustChangePassword: Boolean(auth?.user?.must_change_password),
    login,
    logout,
    changePassword,
    updateLanguage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
