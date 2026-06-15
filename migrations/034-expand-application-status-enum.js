/**
 * Add missing application status values to the enum.
 */
export async function up(qi) {
  const values = ["submitted", "viewed", "interview", "hired", "contacted"];
  for (const val of values) {
    await qi.sequelize.query(
      `ALTER TYPE "enum_applications_status" ADD VALUE IF NOT EXISTS '${val}';`
    );
  }
}

export async function down() {
  // Postgres doesn't support removing enum values — no-op
}
