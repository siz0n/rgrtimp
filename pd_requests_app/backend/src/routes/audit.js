import express from "express";

import { query } from "../config/db.js";
import { auth, permit } from "../middleware/auth.js";

const router = express.Router();

function positiveInteger(
  value,
  fallback,
  maximum = Number.MAX_SAFE_INTEGER
) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

router.get(
  "/",
  auth,
  permit("ADMIN"),
  async (req, res, next) => {
    try {
      const requestedPage = positiveInteger(
        req.query.page,
        1
      );

      const limit = positiveInteger(
        req.query.limit,
        20,
        100
      );

      const search = String(
        req.query.search || ""
      ).trim();

      const entity = String(
        req.query.entity || ""
      ).trim();

      const role = String(
        req.query.role || ""
      ).trim();

      const where = [];
      const params = [];

      function add(value, expression) {
        params.push(value);
        where.push(expression(params.length));
      }

      if (search) {
        add(`%${search}%`, (index) => `
          (
            COALESCE(
              a.actor_username,
              u.username,
              ''
            ) ILIKE $${index}

            OR COALESCE(
              a.actor_email,
              u.email,
              ''
            ) ILIKE $${index}

            OR a.action ILIKE $${index}
            OR a.entity_name ILIKE $${index}

            OR CAST(
              COALESCE(a.entity_id, 0)
              AS TEXT
            ) ILIKE $${index}
          )
        `);
      }

      if (entity) {
        add(
          entity,
          (index) => `a.entity_name = $${index}`
        );
      }

      if (role) {
        add(
          role,
          (index) =>
            `COALESCE(a.actor_role, r.name) = $${index}`
        );
      }

      const whereSql =
        where.length > 0
          ? `WHERE ${where.join(" AND ")}`
          : "";

      const countResult = await query(
        `
          SELECT COUNT(*)::INTEGER AS total
          FROM audit_logs a
          LEFT JOIN users u
            ON u.id = a.user_id
          LEFT JOIN roles r
            ON r.id = u.role_id
          ${whereSql}
        `,
        params
      );

      const total =
        countResult.rows[0]?.total || 0;

      const totalPages = Math.max(
        Math.ceil(total / limit),
        1
      );

      const page = Math.min(
        requestedPage,
        totalPages
      );

      const offset = (page - 1) * limit;

      const listParams = [
        ...params,
        limit,
        offset,
      ];

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;

      const result = await query(
        `
          SELECT
            a.id,
            a.user_id,

            COALESCE(
              a.actor_username,
              u.username,
              'Удалённый пользователь'
            ) AS username,

            COALESCE(
              a.actor_email,
              u.email
            ) AS email,

            COALESCE(
              a.actor_role,
              r.name,
              'UNKNOWN'
            ) AS role,

            a.action,
            a.entity_name,
            a.entity_id,
            a.created_at

          FROM audit_logs a

          LEFT JOIN users u
            ON u.id = a.user_id

          LEFT JOIN roles r
            ON r.id = u.role_id

          ${whereSql}

          ORDER BY
            a.created_at DESC,
            a.id DESC

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
  }
);

export default router;
