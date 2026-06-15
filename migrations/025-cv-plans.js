export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("employees", "cv_plan", {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: "free",
  });
  await queryInterface.addColumn("employees", "cv_plan_purchased_at", {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("employees", "cv_plan");
  await queryInterface.removeColumn("employees", "cv_plan_purchased_at");
}
