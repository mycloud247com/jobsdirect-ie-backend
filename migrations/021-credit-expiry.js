export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("credit_ledger", "expires_at", {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("credit_ledger", "expires_at");
}
