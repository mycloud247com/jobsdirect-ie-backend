/**
 * Adds 'unpaid' status to the job status enum.
 */
export async function up(qi, Sequelize) {
  // Postgres enum update
  await qi.sequelize.query(`ALTER TYPE "enum_jobs_status" ADD VALUE IF NOT EXISTS 'unpaid' AFTER 'draft';`).catch(() => {});
}

export async function down(qi, Sequelize) {
  // Removing values from an ENUM is not directly supported by Postgres.
  // This is generally safe to leave as-is in development/production.
}
