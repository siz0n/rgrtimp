import express from "express";

import { query } from "../config/db.js";
import { auth, permit } from "../middleware/auth.js";
import { logAction } from "../controllers/audit.js";

const router = express.Router();

router.use(auth);

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function buildFilters(req) {
  const { status, type, search } = req.query;
  const where = [];
  const params = [];

  function add(value, expression) {
    params.push(value);
    where.push(expression(params.length));
  }

  if (req.user.role === "USER") {
    add(req.user.id, (index) => `r.user_id = $${index}`);
  }

  if (status) {
    add(status, (index) => `s.name = $${index}`);
  }

  if (type) {
    add(type, (index) => `t.name = $${index}`);
  }

  if (search && String(search).trim()) {
    add(`%${String(search).trim()}%`, (index) => `(
      CAST(r.id AS TEXT) ILIKE $${index}
      OR r.description ILIKE $${index}
      OR COALESCE(r.response_text, '') ILIKE $${index}
      OR t.name ILIKE $${index}
      OR s.name ILIKE $${index}
      OR u.username ILIKE $${index}
      OR COALESCE(e.username, '') ILIKE $${index}
    )`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

router.get("/summary", async (req, res, next) => {
  try {
    const where = [];
    const params = [];

    if (req.user.role === "USER") {
      params.push(req.user.id);
      where.push(`r.user_id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const statsResult = await query(
      `
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (WHERE s.name = 'В обработке')::INTEGER AS in_progress,
          COUNT(*) FILTER (WHERE s.name = 'Выполнено')::INTEGER AS done,
          COUNT(*) FILTER (
            WHERE r.deadline_at < NOW()
              AND s.name NOT IN ('Выполнено', 'Отклонено')
          )::INTEGER AS overdue
        FROM requests r
        JOIN request_statuses s ON s.id = r.status_id
        ${whereSql}
      `,
      params
    );

    const byStatusResult = await query(
      `
        SELECT s.name AS status, COUNT(*)::INTEGER AS count
        FROM requests r
        JOIN request_statuses s ON s.id = r.status_id
        ${whereSql}
        GROUP BY s.id, s.name
        ORDER BY s.id
      `,
      params
    );

    const nearestResult = await query(
      `
        SELECT
          r.id,
          r.deadline_at,
          t.name AS request_type,
          s.name AS status
        FROM requests r
        JOIN request_types t ON t.id = r.request_type_id
        JOIN request_statuses s ON s.id = r.status_id
        ${whereSql}
        ORDER BY r.deadline_at ASC
        LIMIT 5
      `,
      params
    );

    return res.json({
      stats: statsResult.rows[0],
      byStatus: byStatusResult.rows,
      nearestDeadlines: nearestResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const requestedPage = positiveInteger(req.query.page, 1);
    const limit = positiveInteger(req.query.limit, 10, 100);
    const { whereSql, params } = buildFilters(req);

    const countResult = await query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM requests r
        JOIN request_types t ON t.id = r.request_type_id
        JOIN request_statuses s ON s.id = r.status_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN users e ON e.id = r.assigned_employee_id
        ${whereSql}
      `,
      params
    );

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * limit;
    const listParams = [...params, limit, offset];
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const result = await query(
      `
        SELECT
          r.*,
          t.name AS request_type,
          s.name AS status,
          u.username AS applicant,
          e.username AS employee
        FROM requests r
        JOIN request_types t ON t.id = r.request_type_id
        JOIN request_statuses s ON s.id = r.status_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN users e ON e.id = r.assigned_employee_id
        ${whereSql}
        ORDER BY r.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      listParams
    );

    return res.json({
      items: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Некорректный ID обращения" });
    }

    const result = await query(
      `
        SELECT
          r.*,
          t.name AS request_type,
          s.name AS status,
          u.username AS applicant,
          e.username AS employee
        FROM requests r
        JOIN request_types t ON t.id = r.request_type_id
        JOIN request_statuses s ON s.id = r.status_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN users e ON e.id = r.assigned_employee_id
        WHERE r.id = $1
      `,
      [requestId]
    );

    const request = result.rows[0];

    if (!request) {
      return res.status(404).json({ message: "Обращение не найдено" });
    }

    if (
      req.user.role === "USER" &&
      Number(request.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "Нет доступа к чужому обращению" });
    }

    return res.json(request);
  } catch (error) {
    return next(error);
  }
});

router.post("/", permit("USER", "ADMIN"), async (req, res, next) => {
  try {
    const requestTypeId = Number(req.body.request_type_id);
    const description = String(req.body.description || "").trim();

    if (!Number.isInteger(requestTypeId) || requestTypeId <= 0 || !description) {
      return res.status(400).json({
        message: "Выберите тип запроса и заполните описание",
      });
    }

    const statusResult = await query(
      `SELECT id FROM request_statuses WHERE name = 'Новое'`
    );
    const newStatus = statusResult.rows[0];

    if (!newStatus) {
      return res.status(500).json({
        message: 'Статус "Новое" не найден в базе данных',
      });
    }

    const result = await query(
      `
        INSERT INTO requests (
          user_id,
          request_type_id,
          status_id,
          description,
          deadline_at
        )
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
        RETURNING *
      `,
      [req.user.id, requestTypeId, newStatus.id, description]
    );

    const request = result.rows[0];
    await logAction(
      req.user.id,
      "Создание обращения",
      "requests",
      request.id,
      {
        req,
        details: {
          request_type_id: requestTypeId,
          status_id: newStatus.id,
          deadline_at: request.deadline_at,
        },
      }
    );

    return res.status(201).json(request);
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({ message: "Указан несуществующий тип обращения" });
    }

    return next(error);
  }
});

router.put("/:id", permit("ADMIN", "EMPLOYEE"), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Некорректный ID обращения" });
    }

    const oldRequestResult = await query(
      `SELECT * FROM requests WHERE id = $1`,
      [requestId]
    );

    if (oldRequestResult.rows.length === 0) {
      return res.status(404).json({ message: "Обращение не найдено" });
    }

    const statusId = req.body.status_id ? Number(req.body.status_id) : null;
    const responseText =
      req.body.response_text === undefined ? null : String(req.body.response_text);
    const assignedEmployeeId = req.body.assigned_employee_id
      ? Number(req.body.assigned_employee_id)
      : req.user.id;

    let closedAtSql = "";

    if (statusId) {
      const statusResult = await query(
        `SELECT name FROM request_statuses WHERE id = $1`,
        [statusId]
      );

      if (statusResult.rows.length === 0) {
        return res.status(400).json({ message: "Указанный статус не существует" });
      }

      if (["Выполнено", "Отклонено"].includes(statusResult.rows[0].name)) {
        closedAtSql = ", closed_at = NOW()";
      } else {
        closedAtSql = ", closed_at = NULL";
      }
    }

    const result = await query(
      `
        UPDATE requests
        SET
          status_id = COALESCE($1, status_id),
          response_text = COALESCE($2, response_text),
          assigned_employee_id = COALESCE($3, assigned_employee_id),
          updated_at = NOW()
          ${closedAtSql}
        WHERE id = $4
        RETURNING *
      `,
      [statusId, responseText, assignedEmployeeId, requestId]
    );

    const oldRequest = oldRequestResult.rows[0];
    const updatedRequest = result.rows[0];

    await logAction(
      req.user.id,
      "Обработка обращения",
      "requests",
      requestId,
      {
        req,
        details: {
          previous_status_id: oldRequest.status_id,
          new_status_id: updatedRequest.status_id,
          previous_employee_id: oldRequest.assigned_employee_id,
          new_employee_id: updatedRequest.assigned_employee_id,
          response_changed:
            oldRequest.response_text !== updatedRequest.response_text,
          closed_at: updatedRequest.closed_at,
        },
      }
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Некорректный ID обращения" });
    }

    if (!['USER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        message: "Сотрудник не может удалять обращения",
      });
    }

    const requestResult = await query(
      `SELECT id, user_id FROM requests WHERE id = $1`,
      [requestId]
    );
    const request = requestResult.rows[0];

    if (!request) {
      return res.status(404).json({ message: "Обращение не найдено" });
    }

    if (
      req.user.role === "USER" &&
      Number(request.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "Нет доступа к чужому обращению" });
    }

    await query(`DELETE FROM requests WHERE id = $1`, [requestId]);
    await logAction(
      req.user.id,
      "Удаление обращения",
      "requests",
      requestId,
      {
        req,
        details: {
          owner_user_id: request.user_id,
        },
      }
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
