import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const requestsRes = await api.get("/requests");
      setRequests(requestsRes.data || []);

      if (user?.role === "ADMIN") {
        try {
          const logsRes = await api.get("/audit-logs");
          setLogs(logsRes.data || []);
        } catch {
          setLogs([]);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Не удалось загрузить данные панели управления"
      );
    }
  }

  const stats = useMemo(() => {
    const total = requests.length;

    const inProgress = requests.filter((item) =>
      String(item.status_name || item.status || "")
        .toLowerCase()
        .includes("обработ")
    ).length;

    const done = requests.filter((item) =>
      String(item.status_name || item.status || "")
        .toLowerCase()
        .includes("выполн")
    ).length;

    const overdue = requests.filter((item) => {
      if (!item.deadline_at) return false;
      const isClosed =
        String(item.status_name || item.status || "")
          .toLowerCase()
          .includes("выполн") ||
        String(item.status_name || item.status || "")
          .toLowerCase()
          .includes("закрыт");
      return new Date(item.deadline_at) < new Date() && !isClosed;
    }).length;

    return { total, inProgress, done, overdue };
  }, [requests]);

  const byStatus = useMemo(() => {
    const result = {};

    requests.forEach((item) => {
      const status = item.status_name || item.status || "Без статуса";
      result[status] = (result[status] || 0) + 1;
    });

    return Object.entries(result);
  }, [requests]);

  const nearestDeadlines = useMemo(() => {
    return requests
      .filter((item) => item.deadline_at)
      .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))
      .slice(0, 5);
  }, [requests]);

  return (
    <div className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Система контроля ПДн</p>
          <h1>Панель управления</h1>
          <p>
            Здесь отображается сводная информация по обращениям субъектов
            персональных данных, срокам обработки и действиям сотрудников.
          </p>
        </div>

        <div className="hero-user-card">
          <span>Текущий пользователь</span>
          <strong>{user?.username || "Пользователь"}</strong>
          <small>{user?.role || "USER"}</small>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <section className="stats-grid">
        <div className="stat-card">
          <span>Всего обращений</span>
          <strong>{stats.total}</strong>
          <small>зарегистрировано в системе</small>
        </div>

        <div className="stat-card">
          <span>В обработке</span>
          <strong>{stats.inProgress}</strong>
          <small>требуют действий сотрудника</small>
        </div>

        <div className="stat-card">
          <span>Выполнено</span>
          <strong>{stats.done}</strong>
          <small>обращения закрыты</small>
        </div>

        <div className="stat-card danger">
          <span>Просрочено</span>
          <strong>{stats.overdue}</strong>
          <small>нарушен срок обработки</small>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Обращения по статусам</h2>
            <span>{requests.length} записей</span>
          </div>

          {byStatus.length === 0 ? (
            <p className="empty-text">Пока нет обращений для отображения.</p>
          ) : (
            <div className="status-chart">
              {byStatus.map(([status, count]) => {
                const percent = requests.length
                  ? Math.round((count / requests.length) * 100)
                  : 0;

                return (
                  <div className="chart-row" key={status}>
                    <div className="chart-label">
                      <span>{status}</span>
                      <b>{count}</b>
                    </div>
                    <div className="chart-line">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Ближайшие сроки</h2>
            <span>контроль дедлайнов</span>
          </div>

          {nearestDeadlines.length === 0 ? (
            <p className="empty-text">Обращений со сроками пока нет.</p>
          ) : (
            <div className="deadline-list">
              {nearestDeadlines.map((item) => (
                <div className="deadline-item" key={item.id}>
                  <div>
                    <strong>
                      №{item.id} — {item.type_name || item.request_type || "Запрос"}
                    </strong>
                    <span>{item.status_name || item.status || "Без статуса"}</span>
                  </div>
                  <time>
                    {new Date(item.deadline_at).toLocaleDateString("ru-RU")}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {user?.role === "ADMIN" && (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Последние действия</h2>
            <span>журналирование</span>
          </div>

          {logs.length === 0 ? (
            <p className="empty-text">Действий в журнале пока нет.</p>
          ) : (
            <div className="log-list">
              {logs.slice(0, 6).map((log) => (
                <div className="log-item" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>
                    {log.entity_name} №{log.entity_id}
                  </span>
                  <small>
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString("ru-RU")
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
