export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("cvs", "file_key", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("cvs", "file_key");
}
