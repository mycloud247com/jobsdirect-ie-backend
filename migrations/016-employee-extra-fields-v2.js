export async function up(queryInterface, Sequelize) {
  const cols = [
    ["linkedin", Sequelize.STRING],
    ["website", Sequelize.STRING],
    ["portfolio_url", Sequelize.STRING],
    ["github", Sequelize.STRING],
    ["nationality", Sequelize.STRING],
    ["gender", Sequelize.STRING],
    ["expected_salary", Sequelize.STRING],
    ["salary_period", Sequelize.STRING],
    ["projects", Sequelize.JSONB],
    ["certifications", Sequelize.JSONB],
    ["profile_photo_url", Sequelize.STRING],
    ["cv_url", Sequelize.STRING],
  ];

  for (const [name, type] of cols) {
    try {
      await queryInterface.addColumn("employees", name, { type, allowNull: true });
    } catch (e) {
      if (!e.message.includes("already exists")) throw e;
    }
  }
}

export async function down(queryInterface) {
  const cols = [
    "linkedin", "website", "portfolio_url", "github", "nationality",
    "gender", "expected_salary", "salary_period", "projects",
    "certifications", "profile_photo_url", "cv_url",
  ];
  for (const name of cols) {
    try {
      await queryInterface.removeColumn("employees", name);
    } catch {}
  }
}
