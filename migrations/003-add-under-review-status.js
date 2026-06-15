/**
 * Add 'under_review' to enum_employers_verification_status
 */
export async function up(qi, Sequelize) {
  await qi.sequelize.query(`ALTER TYPE "enum_employers_verification_status" ADD VALUE IF NOT EXISTS 'under_review'`);
}

export async function down(qi) {
  // Postgres does not support removing values from ENUM types easily.
  // Usually, you'd have to rename the type, create a new one, and update columns.
  // For a simple add, we can leave the down empty or just log a warning.
}
