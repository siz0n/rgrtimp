import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.roles)) return data.roles;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function Users() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setError("");
      setMessage("");

      const [usersRes, rolesRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/roles"),
      ]);

      const loadedUsers = normalizeArray(usersRes.data);
      const loadedRoles = normalizeArray(rolesRes.data);

      setUsers(loadedUsers);
      setRoles(loadedRoles);

      const initialRoles = {};

      for (const item of loadedUsers) {
        initialRoles[item.id] = String(item.role_id || "");
      }

      setSelectedRoles(initialRoles);
    } catch (err) {
      setUsers([]);
      setRoles([]);
      setError(
        err.response?.data?.message ||
          "Не удалось загрузить пользователей и роли"
      );
    }
  }

  function handleRoleChange(userId, roleId) {
    setSelectedRoles((prev) => ({
      ...prev,
      [userId]: roleId,
    }));
  }

  async function handleSaveRole(item) {
    if (Number(item.id) === Number(currentUser?.id)) {
      setError("Нельзя изменить собственную роль");
      return;
    }

    const roleId = Number(selectedRoles[item.id]);

    if (!roleId) {
      setError("Выберите роль пользователя");
      return;
    }

    try {
      setSavingUserId(item.id);
      setError("");
      setMessage("");

      const res = await api.put(`/users/${item.id}/role`, {
        role_id: roleId,
      });

      const updatedUser = res.data?.user;

      setUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === item.id
            ? {
                ...userItem,
                role_id: updatedUser?.role_id || roleId,
                role:
                  updatedUser?.role ||
                  roles.find((role) => Number(role.id) === roleId)?.name ||
                  userItem.role,
              }
            : userItem
        )
      );

      setMessage(`Роль пользователя ${item.username} изменена`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Не удалось изменить роль пользователя"
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDelete(id) {
    if (Number(id) === Number(currentUser?.id)) {
      setError("Нельзя удалить самого себя");
      return;
    }

    const ok = confirm("Удалить пользователя? Это действие нельзя отменить.");
    if (!ok) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/users/${id}`);

      setUsers((prev) => prev.filter((item) => item.id !== id));

      setSelectedRoles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setMessage("Пользователь удалён");
    } catch (err) {
      setError(
        err.response?.data?.message || "Не удалось удалить пользователя"
      );
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Пользователи</h1>
          <p>Управление учётными записями и ролями пользователей.</p>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="table-card">
        {users.length === 0 ? (
          <p className="empty-text">Пользователей пока нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>

            <tbody>
              {users.map((item) => {
                const isCurrentUser =
                  Number(item.id) === Number(currentUser?.id);

                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>

                    <td>
                      {item.username || "—"}
                      {isCurrentUser && (
                        <span className="current-user-label"> Вы</span>
                      )}
                    </td>

                    <td>{item.email || "—"}</td>

                    <td>
                      <select
                        className="role-select"
                        value={selectedRoles[item.id] || ""}
                        onChange={(e) =>
                          handleRoleChange(item.id, e.target.value)
                        }
                        disabled={isCurrentUser}
                      >
                        <option value="">Выберите роль</option>

                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("ru-RU")
                        : "—"}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => handleSaveRole(item)}
                          disabled={
                            isCurrentUser || savingUserId === item.id
                          }
                        >
                          {savingUserId === item.id
                            ? "Сохранение..."
                            : "Сохранить"}
                        </button>

                        <button
                          type="button"
                          className="danger-button compact-button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isCurrentUser}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
