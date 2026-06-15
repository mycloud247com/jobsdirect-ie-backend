/**
 * Add external_clicks counter for tracking outbound application clicks (§23.2)
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "external_clicks", {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "external_clicks");
}
