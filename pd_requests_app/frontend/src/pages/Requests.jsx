import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { createPageNumbers } from "../utils/pagination";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getStatus(item) {
  return item.status_name || item.status || item.statusName || "Без статуса";
}

function getType(item) {
  return item.type_name || item.request_type || item.typeName || "Запрос";
}

function getDateValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export default function Requests() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canCreate = ["USER", "ADMIN"].includes(user?.role);
  const canDelete = ["USER", "ADMIN"].includes(user?.role);

  useEffect(() => {
    async function loadDictionaries() {
      try {
        const [statusesRes, typesRes] = await Promise.all([
          api.get("/request-statuses"),
          api.get("/request-types"),
        ]);
        setStatuses(normalizeArray(statusesRes.data));
        setTypes(normalizeArray(typesRes.data));
      } catch {
        setStatuses([]);
        setTypes([]);
      }
    }

    loadDictionaries();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => loadRequests(), 250);
    return () => clearTimeout(timeoutId);
  }, [page, statusFilter, typeFilter, search]);

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests", {
        params: {
          page,
          limit: 10,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: search.trim() || undefined,
        },
      });

      const nextItems = normalizeArray(response.data);
      const pagination = response.data?.pagination || {};

      setItems(nextItems);
      setTotal(Number(pagination.total) || nextItems.length);
      setTotalPages(Math.max(Number(pagination.totalPages) || 1, 1));
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || "Не удалось загрузить обращения");
    } finally {
      setLoading(false);
    }
  }

  function resetToFirstPage(setter, value) {
    setter(value);
    setPage(1);
  }

  async function handleDelete(id) {
    if (!confirm("Удалить обращение?")) return;

    try {
      setError("");
      setMessage("");
      await api.delete(`/requests/${id}`);
      setMessage("Обращение удалено");

      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось удалить обращение");
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = getDateValue(a[sortField]);
      const bValue = getDateValue(b[sortField]);
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [items, sortField, sortOrder]);

  const pageNumbers = useMemo(() => createPageNumbers(page, totalPages), [page, totalPages]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Обращения</h1>
          <p>Найдено записей: {total}</p>
        </div>

        {canCreate && (
          <Link to="/requests/create" className="primary-link">
            Создать запрос
          </Link>
        )}
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="filters-card">
        <input
          value={search}
          onChange={(event) => resetToFirstPage(setSearch, event.target.value)}
          placeholder="Поиск по ID, описанию, типу, статусу..."
        />

        <select
          value={statusFilter}
          onChange={(event) => resetToFirstPage(setStatusFilter, event.target.value)}
        >
          <option value="">Все статусы</option>
          {statuses.map((status) => (
            <option key={status.id || status.name} value={status.name}>
              {status.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => resetToFirstPage(setTypeFilter, event.target.value)}
        >
          <option value="">Все типы</option>
          {types.map((type) => (
            <option key={type.id || type.name} value={type.name}>
              {type.name}
            </option>
          ))}
        </select>

        <select value={sortField} onChange={(event) => setSortField(event.target.value)}>
          <option value="created_at">По дате создания</option>
          <option value="updated_at">По дате изменения</option>
          <option value="deadline_at">По сроку обработки</option>
        </select>

        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="desc">Сначала новые</option>
          <option value="asc">Сначала старые</option>
        </select>
      </div>

      <div className="table-card">
        {loading ? (
          <p className="empty-text">Загрузка обращений...</p>
        ) : sortedItems.length === 0 ? (
          <p className="empty-text">Обращения не найдены.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Статус</th>
                <th>Создано</th>
                <th>Изменено</th>
                <th>Срок</th>
                <th>Действия</th>
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{getType(item)}</td>
                  <td>{item.description || "—"}</td>
                  <td><span className="status-badge">{getStatus(item)}</span></td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString("ru-RU") : "—"}</td>
                  <td>{item.updated_at ? new Date(item.updated_at).toLocaleString("ru-RU") : "—"}</td>
                  <td>{item.deadline_at ? new Date(item.deadline_at).toLocaleString("ru-RU") : "—"}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/requests/${item.id}`}>Открыть</Link>
                      {canDelete && (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDelete(item.id)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Пагинация обращений">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Назад
          </button>

          {pageNumbers.map((number) => (
            <button
              type="button"
              key={number}
              className={number === page ? "active" : ""}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Далее
          </button>

          <span>Страница {page} из {totalPages}</span>
        </nav>
      )}
    </div>
  );
}
