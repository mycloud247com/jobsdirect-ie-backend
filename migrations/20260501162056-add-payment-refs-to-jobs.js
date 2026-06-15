/**
 * Adds payment_stripe_id and credit_log_id to jobs.
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "payment_stripe_id", {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await qi.addColumn("jobs", "credit_log_id", {
    type: Sequelize.UUID,
    allowNull: true,
  });
}

export async function down(qi, Sequelize) {
  await qi.removeColumn("jobs", "payment_stripe_id");
  await qi.removeColumn("jobs", "credit_log_id");
}
