export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("employees");
  if (!table.country) {
    await queryInterface.addColumn("employees", "country", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "Ireland",
    });
  }
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("employees", "country");
}
