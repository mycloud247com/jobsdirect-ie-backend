export async function up(qi, Sequelize) {
  await qi.addColumn("employers", "business_address", { type: Sequelize.TEXT, allowNull: true });
}
export async function down(qi) {
  await qi.removeColumn("employers", "business_address");
}
