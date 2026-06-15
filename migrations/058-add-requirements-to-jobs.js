export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "requirements", { type: Sequelize.JSONB, allowNull: true });
}
export async function down(qi) {
  await qi.removeColumn("jobs", "requirements");
}
