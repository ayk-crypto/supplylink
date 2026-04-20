import { query } from "../../config/db.js";

async function getDatabaseTimestamp() {
  const result = await query("SELECT NOW() AS current_time");

  return result.rows[0]?.current_time || null;
}

export { getDatabaseTimestamp };
