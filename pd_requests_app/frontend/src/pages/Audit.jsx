import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";
import { createPageNumbers } from "../utils/pagination";

const ENTITY_OPTIONS = [
  ["", "Все сущности"],
  ["requests", "Обращения"],
  ["comments", "Комментарии"],
  ["users", "Пользователи"],
  ["auth", "Авторизация"],
];

const ROLE_OPTIONS = [
  ["", "Все роли"],
  ["ADMIN", "ADMIN"],
  ["EMPLOYEE", "EMPLOYEE"],
  ["USER", "USER"],
];

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] =
    useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] =
    useState("");
  const [entity, setEntity] =
    useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 250);

    return () => clearTimeout(timer);
  }, [page, search, entity, role]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/audit-logs",
        {
          params: {
            page,
            limit: 20,
            search: search || undefined,
            entity: entity || undefined,
            role: role || undefined,
          },
        }
      );

      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : data?.items || [];

      const pagination =
        data?.pagination || {};

      setLogs(items);

      setTotal(
        Number(
          pagination.total ||
            items.length
        )
      );

      setTotalPages(
        Number(
          pagination.totalPages || 1
        )
      );

      if (
        pagination.page &&
        Number(pagination.page) !== page
      ) {
        setPage(
          Number(pagination.page)
        );
      }
    } catch (requestError) {
      setLogs([]);

      setError(
        requestError.response?.data
          ?.message ||
          "Не удалось загрузить журнал действий"
      );
    } finally {
      setLoading(false);
    }
  }

  function changeFilter(
    setter,
    value
  ) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Журнал действий</h1>

          <p>
            История действий пользователей.
            Всего записей: {total}.
          </p>
        </div>
      </div>

      <div className="filters-card audit-filters">
        <input
          value={search}
          onChange={(event) =>
            changeFilter(
              setSearch,
              event.target.value
            )
          }
          placeholder="Поиск по пользователю или действию"
        />

        <select
          value={entity}
          onChange={(event) =>
            changeFilter(
              setEntity,
              event.target.value
            )
          }
        >
          {ENTITY_OPTIONS.map(
            ([value, label]) => (
              <option
                key={value || "all"}
                value={value}
              >
                {label}
              </option>
            )
          )}
        </select>

        <select
          value={role}
          onChange={(event) =>
            changeFilter(
              setRole,
              event.target.value
            )
          }
        >
          {ROLE_OPTIONS.map(
            ([value, label]) => (
              <option
                key={value || "all"}
                value={value}
              >
                {label}
              </option>
            )
          )}
        </select>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <p className="empty-text">
            Загрузка журнала...
          </p>
        ) : logs.length === 0 ? (
          <p className="empty-text">
            Записей не найдено.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>Дата и время</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>

                  <td>
                    <strong>
                      {log.username ||
                        "Удалённый пользователь"}
                    </strong>

                    {log.email && (
                      <div className="audit-muted">
                        {log.email}
                      </div>
                    )}
                  </td>

                  <td>
                    {log.role || "—"}
                  </td>

                  <td>
                    {log.action || "—"}
                  </td>

                  <td>
                    {log.entity_name ||
                      "—"}

                    {log.entity_id !=
                      null && (
                      <div className="audit-muted">
                        ID:{" "}
                        {log.entity_id}
                      </div>
                    )}
                  </td>

                  <td>
                    {log.created_at
                      ? new Date(
                          log.created_at
                        ).toLocaleString(
                          "ru-RU"
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage(
                (current) =>
                  current - 1
              )
            }
          >
            Назад
          </button>

          {createPageNumbers(
            page,
            totalPages
          ).map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={
                pageNumber === page
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPage(pageNumber)
              }
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            disabled={
              page >= totalPages
            }
            onClick={() =>
              setPage(
                (current) =>
                  current + 1
              )
            }
          >
            Далее
          </button>

          <span>
            Страница {page} из{" "}
            {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
