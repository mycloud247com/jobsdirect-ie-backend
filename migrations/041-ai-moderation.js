/**
 * Add AI content moderation support:
 * - Add 'flagged' and 'suspended' to job status enum
 * - Add moderation_result JSONB column for storing AI scan results
 */
export async function up(qi, Sequelize) {
  await qi.sequelize.query(`ALTER TYPE "enum_jobs_status" ADD VALUE IF NOT EXISTS 'flagged';`).catch(() => {});
  await qi.sequelize.query(`ALTER TYPE "enum_jobs_status" ADD VALUE IF NOT EXISTS 'suspended';`).catch(() => {});

  await qi.addColumn("jobs", "moderation_result", {
    type: Sequelize.JSONB,
    allowNull: true,
  });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "moderation_result");
}
