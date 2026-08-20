import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";

const STORAGE_KEY = "webaules_auth";
const AuthContext = createContext(null);

function loadStored() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
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
