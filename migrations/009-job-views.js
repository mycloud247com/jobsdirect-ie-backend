export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "views_count", {
    type: Sequelize.INTEGER,
    defaultValue: 0,
  });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "views_count");
}
