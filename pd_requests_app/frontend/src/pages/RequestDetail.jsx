import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.statuses)) return data.statuses;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getStatus(item) {
  return item?.status_name || item?.status || "Без статуса";
}

function getType(item) {
  return item?.type_name || item?.request_type || "Запрос";
}

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [statusId, setStatusId] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canProcess = ["ADMIN", "EMPLOYEE"].includes(user?.role);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const requestRes = await api.get(`/requests/${id}`);
      const loadedRequest = requestRes.data;

      setRequest(loadedRequest);
      setStatusId(String(loadedRequest.status_id || ""));
      setResponseText(loadedRequest.response_text || "");

      try {
        const statusesRes = await api.get("/request-statuses");
        setStatuses(normalizeArray(statusesRes.data));
      } catch {
        setStatuses([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить обращение");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.put(`/requests/${id}`, {
        status_id: statusId ? Number(statusId) : undefined,
        response_text: responseText,
      });

      setMessage("Обращение обновлено");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось обновить обращение");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="panel-card">
          <p className="empty-text">Загрузка обращения...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="page">
        {error && <div className="alert error">{error}</div>}
        <Link to="/requests" className="primary-link">
          Вернуться к обращениям
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Обращение №{request.id}</h1>
          <p>Карточка запроса субъекта персональных данных.</p>
        </div>

        <Link to="/requests" className="primary-link">
          Назад к списку
        </Link>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="detail-card">
        <div className="detail-row">
          <span>Тип обращения</span>
          <strong>{getType(request)}</strong>
        </div>

        <div className="detail-row">
          <span>Статус</span>
          <strong>{getStatus(request)}</strong>
        </div>

        <div className="detail-row">
          <span>Заявитель</span>
          <strong>{request.applicant || request.username || "—"}</strong>
        </div>

        <div className="detail-row">
          <span>Ответственный</span>
          <strong>{request.employee || "Не назначен"}</strong>
        </div>

        <div className="detail-row">
          <span>Описание</span>
          <div>{request.description || "—"}</div>
        </div>

        <div className="detail-row">
          <span>Ответ</span>
          <div>{request.response_text || "Ответ пока не указан"}</div>
        </div>

        <div className="detail-row">
          <span>Срок обработки</span>
          <strong>
            {request.deadline_at
              ? new Date(request.deadline_at).toLocaleString("ru-RU")
              : "—"}
          </strong>
        </div>

        <div className="detail-row">
          <span>Создано</span>
          <strong>
            {request.created_at
              ? new Date(request.created_at).toLocaleString("ru-RU")
              : "—"}
          </strong>
        </div>

        <div className="detail-row">
          <span>Обновлено</span>
          <strong>
            {request.updated_at
              ? new Date(request.updated_at).toLocaleString("ru-RU")
              : "—"}
          </strong>
        </div>
      </section>

      {canProcess && (
        <form className="form-card" onSubmit={handleUpdate}>
          <h2>Обработка обращения</h2>

          <label>Статус</label>
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            <option value="">Выберите статус</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <label>Ответ по обращению</label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Введите ответ субъекту персональных данных"
            rows={7}
          />

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить обработку"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
