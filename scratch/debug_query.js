import "dotenv/config";
import DB from "../config/database.js";
import JobService from "../src/services/job.js";

async function debug() {
  const db = new DB();
  // Override logging to capture the SQL
  db.sequelize.options.logging = (sql) => {
    console.log("\n--- GENERATED SQL ---");
    console.log(sql);
    console.log("---------------------\n");
  };

  await db.initiate();
  const context = { db, errorManager: { getError: (code) => new Error(code) } };
  const service = new JobService(context);

  try {
    console.log("Executing JobService.list({ status: 'approved' })...");
    await service.list({ status: "approved" });
  } catch (err) {
    console.error("Query failed, but SQL should be logged above if it reached that stage.");
    console.error(err.message);
  } finally {
    await db.close();
  }
}

debug();
