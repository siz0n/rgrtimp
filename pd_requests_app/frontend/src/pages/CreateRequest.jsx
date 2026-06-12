import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.types)) return data.types;
  if (Array.isArray(data?.requestTypes)) return data.requestTypes;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function CreateRequest() {
  const navigate = useNavigate();

  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    request_type_id: "",
    description: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    try {
      setLoadingTypes(true);
      setError("");

      const res = await api.get("/request-types");
      const normalizedTypes = normalizeArray(res.data);

      setTypes(normalizedTypes);

      if (normalizedTypes.length > 0) {
        setForm((prev) => ({
          ...prev,
          request_type_id: String(normalizedTypes[0].id),
        }));
      }
    } catch (err) {
      setTypes([]);
      setError(
        err.response?.data?.message || "Не удалось загрузить типы обращений"
      );
    } finally {
      setLoadingTypes(false);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.request_type_id) {
      setError("Выберите тип обращения");
      return;
    }

    if (!form.description.trim()) {
      setError("Введите описание обращения");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        request_type_id: Number(form.request_type_id),
        description: form.description.trim(),
      };

      await api.post("/requests", payload);

      navigate("/requests");
    } catch (err) {
      setError(
        err.response?.data?.message || "Не удалось создать обращение"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Создание обращения</h1>
          <p>
            Заполните форму для регистрации запроса субъекта персональных данных.
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert error">{error}</div>}

        <label>Тип обращения</label>
        <select
          name="request_type_id"
          value={form.request_type_id}
          onChange={handleChange}
          disabled={loadingTypes}
        >
          {loadingTypes && <option value="">Загрузка...</option>}

          {!loadingTypes && types.length === 0 && (
            <option value="">Типы обращений не найдены</option>
          )}

          {!loadingTypes &&
            types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
        </select>

        <label>Описание обращения</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Например: прошу удалить мои персональные данные из системы"
          rows={7}
        />

        <div className="form-actions">
          <button type="submit" disabled={loading || loadingTypes}>
            {loading ? "Создание..." : "Создать обращение"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/requests")}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}