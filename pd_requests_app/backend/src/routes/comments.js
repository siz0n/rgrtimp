import express from "express";

import { query } from "../config/db.js";
import { auth, permit } from "../middleware/auth.js";
import { logAction } from "../controllers/audit.js";

const router = express.Router();

router.use(auth);

/**
 * Получение комментариев обращения
 * GET /api/comments/:requestId
 */
router.get("/:requestId", async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Некорректный ID обращения",
      });
    }

    const requestResult = await query(
      `
        SELECT id, user_id
        FROM requests
        WHERE id = $1
      `,
      [requestId]
    );

    const request = requestResult.rows[0];

    if (!request) {
      return res.status(404).json({
        message: "Обращение не найдено",
      });
    }

    if (
      req.user.role === "USER" &&
      Number(request.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        message: "Нет доступа к комментариям чужого обращения",
      });
    }

    const commentsResult = await query(
      `
        SELECT
          c.id,
          c.request_id,
          c.employee_id,
          c.text,
          c.created_at,
          COALESCE(
            u.username,
            'Удалённый пользователь'
          ) AS employee
        FROM comments c
        LEFT JOIN users u
          ON u.id = c.employee_id
        WHERE c.request_id = $1
        ORDER BY c.id ASC
      `,
      [requestId]
    );

    return res.json(commentsResult.rows);
  } catch (error) {
    console.error("Get comments error:", error);
    return next(error);
  }
});

/**
 * Добавление комментария
 * POST /api/comments/:requestId
 * Только EMPLOYEE и ADMIN
 */
router.post(
  "/:requestId",
  permit("EMPLOYEE", "ADMIN"),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const text = String(req.body.text || "").trim();

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
          message: "Некорректный ID обращения",
        });
      }

      if (!text) {
        return res.status(400).json({
          message: "Комментарий пустой",
        });
      }

      const requestResult = await query(
        `
          SELECT id
          FROM requests
          WHERE id = $1
        `,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          message: "Обращение не найдено",
        });
      }

      const insertResult = await query(
        `
          INSERT INTO comments (
            request_id,
            employee_id,
            text
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            request_id,
            employee_id,
            text,
            created_at
        `,
        [requestId, req.user.id, text]
      );

      const comment = insertResult.rows[0];

      await logAction(
        req.user.id,
        "Добавление комментария",
        "comments",
        comment.id,
        {
          req,
          details: {
            request_id: requestId,
            text_length: text.length,
          },
        }
      );

      return res.status(201).json({
        ...comment,
        employee: req.user.username,
      });
    } catch (error) {
      console.error("Create comment error:", error);
      return next(error);
    }
  }
);

export default router;
