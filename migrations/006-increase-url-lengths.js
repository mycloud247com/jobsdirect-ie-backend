/**
 * Change URL and key fields to TEXT to avoid character limit issues
 */
export async function up(qi, Sequelize) {
  // Employers
  await qi.changeColumn("employers", "verification_doc_url", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employers", "verification_doc_key", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employers", "website", { type: Sequelize.TEXT, allowNull: true });

  // Employees
  await qi.changeColumn("employees", "cv_url", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employees", "profile_photo_url", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employees", "linkedin", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employees", "website", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employees", "portfolio_url", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("employees", "github", { type: Sequelize.TEXT, allowNull: true });

  // Jobs
  await qi.changeColumn("jobs", "source_url", { type: Sequelize.TEXT, allowNull: true });
  await qi.changeColumn("jobs", "application_url", { type: Sequelize.TEXT, allowNull: true });
}

export async function down(qi, Sequelize) {
  // We won't easily go back to 255 if data is already longer, but for schema completeness:
  await qi.changeColumn("employers", "verification_doc_url", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employers", "verification_doc_key", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employers", "website", { type: Sequelize.STRING(255), allowNull: true });
  
  await qi.changeColumn("employees", "cv_url", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employees", "profile_photo_url", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employees", "linkedin", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employees", "website", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employees", "portfolio_url", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("employees", "github", { type: Sequelize.STRING(255), allowNull: true });

  await qi.changeColumn("jobs", "source_url", { type: Sequelize.STRING(255), allowNull: true });
  await qi.changeColumn("jobs", "application_url", { type: Sequelize.STRING(255), allowNull: true });
}
