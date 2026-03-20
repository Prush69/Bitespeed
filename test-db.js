const { Pool } = require('pg');

async function test() {
  const url = "postgresql://postgres:black69sheepmodi@db.uxngjptoibbgazxylmse.supabase.co:5432/postgres?sslmode=no-verify";
  console.log("DB URL:", url);
  try {
    const pool = new Pool({
      connectionString: url,
    });
    const res = await pool.query('SELECT NOW()');
    console.log("Connected!", res.rows[0]);
    pool.end();
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
