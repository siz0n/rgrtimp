import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
    }

    if (status === 403) {
      window.dispatchEvent(
        new CustomEvent("api:forbidden", {
          detail: error.response?.data?.message || "Недостаточно прав",
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
