/**
 * Add approved_at column to jobs table
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "approved_at", {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "approved_at");
}
