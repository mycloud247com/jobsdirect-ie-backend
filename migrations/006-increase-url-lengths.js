/**
 * Change URL and key fields to TEXT to avoid character limit issues
 */
async function safeChangeColumn(qi, table, column, definition) {
  try {
    const tableDesc = await qi.describeTable(table);
    if (tableDesc[column]) {
      await qi.changeColumn(table, column, definition);
    }
  } catch (err) {
    // Ignore if the table or column does not exist in this schema state.
  }
}

export async function up(qi, Sequelize) {
  // Employers
  await safeChangeColumn(qi, "employers", "verification_doc_url", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employers", "verification_doc_key", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employers", "website", { type: Sequelize.TEXT, allowNull: true });

  // Employees
  await safeChangeColumn(qi, "employees", "cv_url", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employees", "profile_photo_url", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employees", "linkedin", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employees", "website", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employees", "portfolio_url", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "employees", "github", { type: Sequelize.TEXT, allowNull: true });

  // Jobs
  await safeChangeColumn(qi, "jobs", "source_url", { type: Sequelize.TEXT, allowNull: true });
  await safeChangeColumn(qi, "jobs", "application_url", { type: Sequelize.TEXT, allowNull: true });
}

export async function down(qi, Sequelize) {
  // We won't easily go back to 255 if data is already longer, but for schema completeness:
  await safeChangeColumn(qi, "employers", "verification_doc_url", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employers", "verification_doc_key", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employers", "website", { type: Sequelize.STRING(255), allowNull: true });
  
  await safeChangeColumn(qi, "employees", "cv_url", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employees", "profile_photo_url", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employees", "linkedin", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employees", "website", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employees", "portfolio_url", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "employees", "github", { type: Sequelize.STRING(255), allowNull: true });

  await safeChangeColumn(qi, "jobs", "source_url", { type: Sequelize.STRING(255), allowNull: true });
  await safeChangeColumn(qi, "jobs", "application_url", { type: Sequelize.STRING(255), allowNull: true });
}
