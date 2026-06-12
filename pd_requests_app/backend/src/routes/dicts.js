import express from 'express';

import { query } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/request-types', async (req, res, next) => {
  try {
    const sql = `
      SELECT *
      FROM request_types
      ORDER BY id
    `;

    const { rows } = await query(sql);

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.get('/request-statuses', async (req, res, next) => {
  try {
    const sql = `
      SELECT *
      FROM request_statuses
      ORDER BY id
    `;

    const { rows } = await query(sql);

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

export default router;