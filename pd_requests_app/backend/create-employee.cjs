require("dotenv").config();
const bcrypt = require("bcryptjs");
const pg = require("pg");

const { Pool } = pg;

const pool = new Pool({
  host: "127.0.0.1",
  port: 5433,
  database: "pd_requests_db",
  user: "postgres",
  password: "postgres",
});

async function main() {
  const username = "employee";
  const email = "employee@example.com";
  const password = "employee";

  const passwordHash = await bcrypt.hash(password, 10);

  const roleResult = await pool.query(
    "SELECT id FROM roles WHERE name = $1",
    ["EMPLOYEE"]
  );

  if (roleResult.rows.length === 0) {
    throw new Error("Роль EMPLOYEE не найдена");
  }

  const roleId = roleResult.rows[0].id;

  const existing = await pool.query(
    "SELECT id FROM users WHERE username = $1 OR email = $2",
    [username, email]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          role_id = $2,
          is_email_verified = true,
          email_verification_code = NULL,
          email_verification_expires = NULL
      WHERE username = $3 OR email = $4
      `,
      [passwordHash, roleId, username, email]
    );

    console.log("Сотрудник обновлён: employee / employee");
  } else {
    await pool.query(
      `
      INSERT INTO users (
        username,
        email,
        password_hash,
        role_id,
        is_email_verified
      )
      VALUES ($1, $2, $3, $4, true)
      `,
      [username, email, passwordHash, roleId]
    );

    console.log("Сотрудник создан: employee / employee");
  }

  await pool.end();
}

main().catch((error) => {
  console.error("Ошибка:", error.message);
  process.exit(1);
});
