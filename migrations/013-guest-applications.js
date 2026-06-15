export async function up(qi, Sequelize) {
  await qi.changeColumn("applications", "user_id", { type: Sequelize.UUID, allowNull: true });
  await qi.addColumn("applications", "is_guest", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("applications", "guest_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "guest_email", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "guest_phone", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "guest_county", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "guest_country", { type: Sequelize.STRING, allowNull: true });
}

export async function down(qi, Sequelize) {
  await qi.removeColumn("applications", "is_guest");
  await qi.removeColumn("applications", "guest_name");
  await qi.removeColumn("applications", "guest_email");
  await qi.removeColumn("applications", "guest_phone");
  await qi.removeColumn("applications", "guest_county");
  await qi.removeColumn("applications", "guest_country");
  await qi.changeColumn("applications", "user_id", { type: Sequelize.UUID, allowNull: false });
}
