const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  try {
    const username = "admin";
    const email = "admin@example.com";
    const password = "admin";

    const passwordHash = await bcrypt.hash(password, 10);

    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      ["ADMIN"]
    );

    if (roleResult.rows.length === 0) {
      throw new Error("Роль ADMIN не найдена в таблице roles");
    }

    const roleId = roleResult.rows[0].id;

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      await pool.query(
        `
        UPDATE users
        SET password_hash = $1,
            role_id = $2,
            email = $3
        WHERE username = $4 OR email = $3
        `,
        [passwordHash, roleId, email, username]
      );

      console.log("Пользователь admin уже был. Пароль и роль обновлены.");
    } else {
      await pool.query(
        `
        INSERT INTO users (username, email, password_hash, role_id)
        VALUES ($1, $2, $3, $4)
        `,
        [username, email, passwordHash, roleId]
      );

      console.log("Пользователь admin создан.");
    }

    console.log("Логин: admin");
    console.log("Пароль: admin");
  } catch (error) {
    console.error("Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
