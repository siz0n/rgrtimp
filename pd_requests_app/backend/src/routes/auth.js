import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { query } from "../config/db.js";
import { auth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../config/mail.js";
import { logAction } from "../controllers/audit.js";

const router = express.Router();

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "change_this_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    }
  );
}

/**
 * Регистрация пользователя.
 * Пользователь сначала сохраняется в pending_users,
 * а после подтверждения email переносится в users.
 */
router.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Заполните логин, email и пароль",
      });
    }

    if (username.length < 3 || username.length > 60) {
      return res.status(400).json({
        message: "Логин должен содержать от 3 до 60 символов",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Укажите корректный email",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Пароль должен содержать минимум 8 символов",
      });
    }

    const existingUser = await query(
      `
        SELECT id
        FROM users
        WHERE username = $1 OR email = $2
      `,
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message:
          "Пользователь с таким логином или email уже существует",
      });
    }

    const roleResult = await query(
      `
        SELECT id
        FROM roles
        WHERE name = $1
      `,
      ["USER"]
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        message: "Роль USER не найдена в базе данных",
      });
    }

    const roleId = roleResult.rows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (mailError) {
      console.error("Mail send error:", mailError);

      return res.status(500).json({
        message:
          "Не удалось отправить код подтверждения на email. Аккаунт не создан.",
      });
    }

    await query(
      `
        DELETE FROM pending_users
        WHERE email = $1 OR username = $2
      `,
      [email, username]
    );

    await query(
      `
        INSERT INTO pending_users (
          username,
          email,
          password_hash,
          role_id,
          email_verification_code,
          email_verification_expires
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        username,
        email,
        passwordHash,
        roleId,
        verificationCode,
        verificationExpires,
      ]
    );

    return res.status(201).json({
      message:
        "Код подтверждения отправлен на email. Завершите регистрацию вводом кода.",
      email,
      needVerification: true,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Ошибка регистрации пользователя",
    });
  }
});

/**
 * Подтверждение email.
 */
router.post("/verify-email", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const code = String(req.body.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({
        message: "Email и код подтверждения обязательны",
      });
    }

    const pendingResult = await query(
      `
        SELECT *
        FROM pending_users
        WHERE email = $1
      `,
      [email]
    );

    if (pendingResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Заявка на регистрацию с таким email не найдена. Зарегистрируйтесь повторно.",
      });
    }

    const pendingUser = pendingResult.rows[0];

    if (
      String(pendingUser.email_verification_code) !==
      String(code)
    ) {
      return res.status(400).json({
        message: "Неверный код подтверждения",
      });
    }

    if (
      new Date(pendingUser.email_verification_expires) <
      new Date()
    ) {
      await query(
        `
          DELETE FROM pending_users
          WHERE id = $1
        `,
        [pendingUser.id]
      );

      return res.status(400).json({
        message:
          "Срок действия кода истёк. Зарегистрируйтесь повторно.",
      });
    }

    const existingUser = await query(
      `
        SELECT id
        FROM users
        WHERE username = $1 OR email = $2
      `,
      [pendingUser.username, pendingUser.email]
    );

    if (existingUser.rows.length > 0) {
      await query(
        `
          DELETE FROM pending_users
          WHERE id = $1
        `,
        [pendingUser.id]
      );

      return res.status(409).json({
        message:
          "Пользователь с таким логином или email уже существует",
      });
    }

    const createdUserResult = await query(
      `
        INSERT INTO users (
          username,
          email,
          password_hash,
          role_id,
          is_email_verified
        )
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, username, email
      `,
      [
        pendingUser.username,
        pendingUser.email,
        pendingUser.password_hash,
        pendingUser.role_id,
      ]
    );

    const createdUser = createdUserResult.rows[0];

    await query(
      `
        DELETE FROM pending_users
        WHERE id = $1
      `,
      [pendingUser.id]
    );

    await logAction(
      createdUser.id,
      "Подтверждение email и завершение регистрации",
      "auth",
      createdUser.id,
      {
        actorUsername: createdUser.username,
        actorEmail: createdUser.email,
        actorRole: "USER",
      }
    );

    return res.status(200).json({
      message:
        "Email успешно подтверждён. Теперь можно войти в систему.",
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      message: "Ошибка подтверждения email",
    });
  }
});

/**
 * Повторная отправка кода подтверждения.
 */
router.post("/resend-code", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email обязателен",
      });
    }

    const pendingResult = await query(
      `
        SELECT id, email
        FROM pending_users
        WHERE email = $1
      `,
      [email]
    );

    if (pendingResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Заявка на регистрацию с таким email не найдена. Зарегистрируйтесь повторно.",
      });
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (mailError) {
      console.error("Mail resend error:", mailError);

      return res.status(500).json({
        message:
          "Не удалось отправить новый код подтверждения.",
      });
    }

    await query(
      `
        UPDATE pending_users
        SET
          email_verification_code = $1,
          email_verification_expires = $2
        WHERE id = $3
      `,
      [
        verificationCode,
        verificationExpires,
        pendingResult.rows[0].id,
      ]
    );

    return res.status(200).json({
      message: "Новый код подтверждения отправлен на email",
    });
  } catch (error) {
    console.error("Resend code error:", error);

    return res.status(500).json({
      message: "Ошибка повторной отправки кода",
    });
  }
});

/**
 * Вход пользователя.
 */
router.post("/login", async (req, res) => {
  try {
    const { login, username, email, password } = req.body;

    const userLogin = String(
      login || username || email || ""
    ).trim();

    if (!userLogin || !password) {
      return res.status(400).json({
        message: "Введите логин/email и пароль",
      });
    }

    const userResult = await query(
      `
        SELECT
          users.id,
          users.username,
          users.email,
          users.password_hash,
          users.is_email_verified,
          roles.name AS role
        FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.username = $1 OR users.email = $1
      `,
      [userLogin]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        message: "Неверный логин или пароль",
      });
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Неверный логин или пароль",
      });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        message:
          "Email не подтверждён. Введите код из письма.",
        needVerification: true,
        email: user.email,
      });
    }

    const token = createToken(user);

    await logAction(
      user.id,
      "Вход в систему",
      "auth",
      user.id,
      {
        actorUsername: user.username,
        actorEmail: user.email,
        actorRole: user.role,
      }
    );

    return res.status(200).json({
      message: "Вход выполнен успешно",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Ошибка входа в систему",
    });
  }
});

/**
 * Выход пользователя.
 *
 * JWT остаётся действительным до истечения срока,
 * но клиент удаляет его из localStorage.
 */
router.post("/logout", auth, async (req, res) => {
  try {
    await logAction(
      req.user.id,
      "Выход из системы",
      "auth",
      req.user.id,
      {
        actorUsername: req.user.username,
        actorEmail: req.user.email,
        actorRole: req.user.role,
      }
    );

    return res.status(200).json({
      message: "Выход выполнен успешно",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Ошибка выхода из системы",
    });
  }
});

/**
 * Получение текущего пользователя.
 */
router.get("/me", auth, async (req, res) => {
  try {
    const userResult = await query(
      `
        SELECT
          users.id,
          users.username,
          users.email,
          users.is_email_verified,
          roles.name AS role
        FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = $1
      `,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "Пользователь не найден",
      });
    }

    return res.status(200).json({
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      message: "Ошибка получения данных пользователя",
    });
  }
});

export default router;
