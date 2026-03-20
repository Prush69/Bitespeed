import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Contact" (
        id SERIAL PRIMARY KEY,
        "phoneNumber" VARCHAR(255),
        email VARCHAR(255),
        "linkedId" INTEGER,
        "linkPrecedence" VARCHAR(50) CHECK("linkPrecedence" IN ('primary', 'secondary')) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL,
        "deletedAt" TIMESTAMP
      );
    `);
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
};

initDb();

export default pool;
