import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    setMessage("");
    if (form.username.trim().length < 3) {
      setError("Логин должен содержать минимум 3 символа");
      return;
    }

    if (form.password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setMessage(
        res.data.message ||
          "Пользователь зарегистрирован. Проверьте email."
      );

      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>
        <p>Создайте учётную запись для подачи запросов субъектов ПДн.</p>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <label>Логин</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Например: ivanov"
          minLength={3}
          maxLength={60}
          required
        />

        <label>Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="ivanov@example.com"
          type="email"
          required
        />

        <label>Пароль</label>
        <input
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Минимум 8 символов"
          type="password"
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}