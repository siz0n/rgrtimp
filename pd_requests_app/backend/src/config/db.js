import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://pd_app:pd_app_pass@127.0.0.1:5433/pd_requests_db",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
