import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await api.post("/auth/verify-email", {
        email,
        code,
      });

      setMessage(res.data.message || "Email подтверждён");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка подтверждения email");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Подтверждение email</h1>
        <p>
          Введите код, который был отправлен на почту после регистрации.
        </p>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Введите email"
        />

        <label>Код подтверждения</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Например: 123456"
          maxLength={6}
        />

        <button type="submit">Подтвердить</button>
      </form>
    </div>
  );
}
