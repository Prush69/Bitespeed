const { Pool } = require('pg');

async function test() {
  const url = "postgresql://postgres.uxngjptoibbgazxylmse:black69sheepmodi@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  console.log("DB URL:", url);
  try {
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false }
    });
    const res = await pool.query('SELECT NOW()');
    console.log("Connected!", res.rows[0]);
    pool.end();
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
