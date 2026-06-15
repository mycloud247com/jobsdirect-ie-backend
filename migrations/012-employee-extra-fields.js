export async function up(qi, Sequelize) {
  await qi.addColumn("employees", "right_to_work", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "driving_licence", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "languages", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "county", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "country", { type: Sequelize.STRING, defaultValue: "Ireland" });
}

export async function down(qi) {
  await qi.removeColumn("employees", "right_to_work");
  await qi.removeColumn("employees", "driving_licence");
  await qi.removeColumn("employees", "languages");
  await qi.removeColumn("employees", "county");
  await qi.removeColumn("employees", "country");
}
