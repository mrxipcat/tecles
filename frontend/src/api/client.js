import axios from "axios";

const client = axios.create({
  baseURL: "/api",
});

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem("webaules_auth");
  if (raw) {
    const { token } = JSON.parse(raw);
    if (token) {
      config.headers["X-Auth-Token"] = token;
    }
  }
  return config;
});

export default client;
