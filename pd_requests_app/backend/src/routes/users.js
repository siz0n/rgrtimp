import express from "express";
import { query } from "../config/db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { logAction } from "../controllers/audit.js";

const router = express.Router();

/**
 * Получение списка пользователей
 * GET /api/users
 * Только ADMIN
 */
router.get("/", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const result = await query(`
      SELECT
        users.id,
        users.username,
        users.email,
        users.is_email_verified,
        users.created_at,
        roles.id AS role_id,
        roles.name AS role
      FROM users
      JOIN roles ON users.role_id = roles.id
      ORDER BY users.id ASC
    `);

    return res.json({
      users: result.rows,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Ошибка получения списка пользователей",
    });
  }
});

/**
 * Получение списка ролей
 * GET /api/users/roles
 * Только ADMIN
 */
router.get("/roles", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name
      FROM roles
      ORDER BY id ASC
    `);

    return res.json({
      roles: result.rows,
    });
  } catch (error) {
    console.error("Get roles error:", error);

    return res.status(500).json({
      message: "Ошибка получения списка ролей",
    });
  }
});

/**
 * Изменение роли пользователя
 * PUT /api/users/:id/role
 * Только ADMIN
 */
router.put("/:id/role", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const roleId = Number(req.body.role_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Некорректный ID пользователя",
      });
    }

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({
        message: "Не указана корректная роль пользователя",
      });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        message: "Нельзя изменить собственную роль",
      });
    }

    const userResult = await query(
      `
        SELECT id, username, role_id
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "Пользователь не найден",
      });
    }

    const roleResult = await query(
      `
        SELECT id, name
        FROM roles
        WHERE id = $1
      `,
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        message: "Указанная роль не существует",
      });
    }

    const updateResult = await query(
      `
        UPDATE users
        SET role_id = $1
        WHERE id = $2
        RETURNING id, username, email, role_id
      `,
      [roleId, userId]
    );

    await logAction(
      req.user.id,
      `Изменение роли пользователя на ${roleResult.rows[0].name}`,
      "users",
      userId,
      {
        req,
        details: {
          target_username: userResult.rows[0].username,
          previous_role_id: userResult.rows[0].role_id,
          new_role_id: roleId,
          new_role: roleResult.rows[0].name,
        },
      }
    );

    return res.json({
      message: "Роль пользователя изменена",
      user: {
        ...updateResult.rows[0],
        role: roleResult.rows[0].name,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
      message: "Ошибка изменения роли пользователя",
    });
  }
});

/**
 * Удаление пользователя
 * DELETE /api/users/:id
 * Только ADMIN
 */
router.delete("/:id", auth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Некорректный ID пользователя",
      });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        message: "Нельзя удалить собственную учётную запись",
      });
    }

    const deleteResult = await query(
      `
        DELETE FROM users
        WHERE id = $1
        RETURNING id, username, email
      `,
      [userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        message: "Пользователь не найден",
      });
    }

    await logAction(
      req.user.id,
      `Удаление пользователя ${deleteResult.rows[0].username}`,
      "users",
      userId,
      {
        req,
        details: {
          deleted_username: deleteResult.rows[0].username,
          deleted_email: deleteResult.rows[0].email,
        },
      }
    );

    return res.json({
      message: "Пользователь удалён",
      user: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("Delete user error:", {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message,
    });

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Пользователь связан с данными базы. Проверьте внешние ключи requests, comments и audit_logs.",
        constraint: error.constraint,
      });
    }

    return res.status(500).json({
      message: "Внутренняя ошибка при удалении пользователя",
    });
  }
});

export default router;
