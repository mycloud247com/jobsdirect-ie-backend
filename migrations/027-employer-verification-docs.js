export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("employers", "verification_doc_url", {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn("employers", "verification_doc_key", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("employers", "verification_doc_url");
  await queryInterface.removeColumn("employers", "verification_doc_key");
}
