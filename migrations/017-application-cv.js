export async function up(qi, Sequelize) {
  await qi.addColumn("applications", "cv_url", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "cv_file_key", { type: Sequelize.STRING, allowNull: true });
}

export async function down(qi, Sequelize) {
  await qi.removeColumn("applications", "cv_url");
  await qi.removeColumn("applications", "cv_file_key");
}
