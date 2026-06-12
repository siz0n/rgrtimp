import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    login: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", form);

      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;

      if (data?.needVerification && data?.email) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }

      setError(data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Вход</h1>
        <p>Войдите в систему учёта запросов субъектов персональных данных.</p>

        {error && <div className="alert error">{error}</div>}

        <label>Логин или email</label>
        <input
          name="login"
          value={form.login}
          onChange={handleChange}
          placeholder="admin или admin@example.com"
        />

        <label>Пароль</label>
        <input
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Введите пароль"
          type="password"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>

        <p className="auth-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>

      </form>
    </div>
  );
}