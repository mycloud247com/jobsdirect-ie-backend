import "dotenv/config";
import { Sequelize } from "sequelize";
import DB from "./config/database.js";

/**
 * Migration script to copy SiteSetting records from an OLD database to the CURRENT one.
 * Usage: OLD_DB_URL=postgres://user:pass@host:port/dbname node migrate-settings.js
 */

async function migrate() {
  const oldUrl = process.env.OLD_DB_URL;
  if (!oldUrl) {
    console.error("ERROR: OLD_DB_URL environment variable is required.");
    console.log("Usage: OLD_DB_URL=postgres://user:pass@host:port/dbname node migrate-settings.js");
    process.exit(1);
  }

  console.log("Connecting to CURRENT database...");
  const currentDb = new DB();
  await currentDb.initiate();
  console.log("Connected to CURRENT database.");

  console.log("Connecting to OLD database...");
  const oldSequelize = new Sequelize(oldUrl, {
    logging: false,
    dialect: "postgres",
  });
  await oldSequelize.authenticate();
  console.log("Connected to OLD database.");

  try {
    // We define a simple model for the old DB to fetch site_settings
    const OldSiteSetting = oldSequelize.define("site_setting", {
      key: { type: Sequelize.STRING, primaryKey: true },
      value: { type: Sequelize.JSONB },
    }, {
      freezeTableName: true,
      underscored: true,
      timestamps: true,
    });

    console.log("Fetching settings from OLD database...");
    const oldSettings = await OldSiteSetting.findAll();
    console.log(`Found ${oldSettings.length} setting records.`);

    for (const setting of oldSettings) {
      console.log(`Migrating setting: ${setting.key}...`);
      await currentDb.SiteSetting.upsert({
        key: setting.key,
        value: setting.value,
      });
    }

    console.log("\nMigration complete! Site settings and plans have been copied.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await currentDb.close();
    await oldSequelize.close();
  }
}

migrate();
