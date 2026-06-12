import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <Link
        to={user ? "/dashboard" : "/login"}
        className="brand"
      >
        <span className="brand-title">
          PD Control
        </span>

        <span className="brand-subtitle">
          запросы субъектов ПДн
        </span>
      </Link>

      <nav className="topnav">
        {user ? (
          <>
            <NavLink to="/dashboard">
              Панель
            </NavLink>

            <NavLink to="/requests">
              Обращения
            </NavLink>

            {["USER", "ADMIN"].includes(
              user.role
            ) && (
              <NavLink to="/requests/create">
                Создать запрос
              </NavLink>
            )}

            {user.role === "ADMIN" && (
              <>
                <NavLink to="/users">
                  Пользователи
                </NavLink>

                <NavLink to="/audit">
                  Журнал
                </NavLink>
              </>
            )}

            <span className="user-pill">
              {user.username || "user"} ·{" "}
              {user.role}
            </span>

            <button
              type="button"
              className="nav-button"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">
              Вход
            </NavLink>

            <NavLink
              to="/register"
              className="nav-register"
            >
              Регистрация
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
