import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    stats: { total: 0, in_progress: 0, done: 0, overdue: 0 },
    byStatus: [],
    nearestDeadlines: [],
  });
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setError("");
      const summaryRes = await api.get("/requests/summary");
      setSummary(summaryRes.data);

      if (user?.role === "ADMIN") {
        try {
          const logsRes = await api.get("/audit-logs", {
            params: { page: 1, limit: 6 },
          });
          const auditData = logsRes.data;
          setLogs(
            Array.isArray(auditData)
              ? auditData
              : Array.isArray(auditData?.items)
                ? auditData.items
                : []
          );
        } catch {
          setLogs([]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось загрузить данные панели управления");
    }
  }

  const stats = summary.stats || {};
  const byStatus = Array.isArray(summary.byStatus) ? summary.byStatus : [];
  const nearestDeadlines = Array.isArray(summary.nearestDeadlines)
    ? summary.nearestDeadlines
    : [];

  return (
    <div className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Система контроля ПДн</p>
          <h1>Панель управления</h1>
          <p>Сводная информация по всем доступным обращениям, срокам и статусам.</p>
        </div>
        <div className="hero-user-card">
          <span>Текущий пользователь</span>
          <strong>{user?.username || "Пользователь"}</strong>
          <small>{user?.role || "USER"}</small>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <section className="stats-grid">
        <div className="stat-card"><span>Всего обращений</span><strong>{stats.total || 0}</strong><small>зарегистрировано в системе</small></div>
        <div className="stat-card"><span>В обработке</span><strong>{stats.in_progress || 0}</strong><small>требуют действий сотрудника</small></div>
        <div className="stat-card"><span>Выполнено</span><strong>{stats.done || 0}</strong><small>обращения закрыты</small></div>
        <div className="stat-card danger"><span>Просрочено</span><strong>{stats.overdue || 0}</strong><small>нарушен срок обработки</small></div>
      </section>

      <section className="dashboard-grid">
        <div className="panel-card">
          <div className="panel-header"><h2>Обращения по статусам</h2><span>{stats.total || 0} записей</span></div>
          {byStatus.length === 0 ? (
            <p className="empty-text">Пока нет обращений для отображения.</p>
          ) : (
            <div className="status-chart">
              {byStatus.map((item) => {
                const percent = stats.total ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div className="chart-row" key={item.status}>
                    <div className="chart-label"><span>{item.status}</span><b>{item.count}</b></div>
                    <div className="chart-line"><div style={{ width: `${percent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header"><h2>Ближайшие сроки</h2><span>контроль дедлайнов</span></div>
          {nearestDeadlines.length === 0 ? (
            <p className="empty-text">Обращений со сроками пока нет.</p>
          ) : (
            <div className="deadline-list">
              {nearestDeadlines.map((item) => (
                <div className="deadline-item" key={item.id}>
                  <div><strong>№{item.id} — {item.request_type}</strong><span>{item.status}</span></div>
                  <time>{new Date(item.deadline_at).toLocaleDateString("ru-RU")}</time>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {user?.role === "ADMIN" && (
        <section className="panel-card">
          <div className="panel-header"><h2>Последние действия</h2><span>журналирование</span></div>
          {logs.length === 0 ? (
            <p className="empty-text">Действий в журнале пока нет.</p>
          ) : (
            <div className="log-list">
              {logs.slice(0, 6).map((log) => (
                <div className="log-item" key={log.id}>
                  <strong>{log.action || "Действие"}</strong>
                  <span>{log.entity_name || "Запись"} №{log.entity_id || "-"}</span>
                  <small>{log.created_at ? new Date(log.created_at).toLocaleString("ru-RU") : ""}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
