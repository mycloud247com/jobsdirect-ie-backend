export async function up(qi, Sequelize) {
  await qi.addColumn("users", "google_id", {
    type: Sequelize.STRING,
    allowNull: true,
    unique: true,
  });
}

export async function down(qi) {
  await qi.removeColumn("users", "google_id").catch(() => {});
}
