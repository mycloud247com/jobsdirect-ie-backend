export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("contact_messages", "phone", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("contact_messages", "phone");
}
