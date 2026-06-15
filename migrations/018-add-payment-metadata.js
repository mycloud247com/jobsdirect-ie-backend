export async function up(queryInterface, Sequelize) {
  // Check if column exists first
  const table = await queryInterface.describeTable("payments");
  if (!table.metadata) {
    await queryInterface.addColumn("payments", "metadata", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("payments", "metadata");
}
