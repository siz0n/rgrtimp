import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser || savedUser === "undefined") {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );

  function login(tokenValue, userValue) {
    localStorage.setItem("token", tokenValue);

    localStorage.setItem(
      "user",
      JSON.stringify(userValue)
    );

    setToken(tokenValue);
    setUser(userValue);
  }

  async function logout() {
    try {
      const currentToken =
        localStorage.getItem("token");

      if (currentToken) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      console.error(
        "Logout request error:",
        error
      );
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
    }
  }

  useEffect(() => {
    function handleForcedLogout() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
    }

    window.addEventListener(
      "auth:logout",
      handleForcedLogout
    );

    return () => {
      window.removeEventListener(
        "auth:logout",
        handleForcedLogout
      );
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(
          token && user
        ),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
