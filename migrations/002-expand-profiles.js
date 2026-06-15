/**
 * Expand employees and employers tables with missing profile fields.
 */
export async function up(qi, Sequelize) {
  // ─── Expand verification_status enum ──────────────────────
  await qi.sequelize.query(`ALTER TYPE "enum_employers_verification_status" ADD VALUE IF NOT EXISTS 'draft'`);
  await qi.sequelize.query(`ALTER TYPE "enum_employers_verification_status" ADD VALUE IF NOT EXISTS 'submitted'`);

  // ─── Employees: add missing columns ──────────────────────
  await qi.addColumn("employees", "first_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "last_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "address", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "desired_job_type", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "desired_location", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "availability", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "is_searchable", { type: Sequelize.BOOLEAN, defaultValue: true });
  await qi.addColumn("employees", "work_experience", { type: Sequelize.JSONB, allowNull: true });
  await qi.addColumn("employees", "education", { type: Sequelize.JSONB, allowNull: true });
  await qi.addColumn("employees", "cv_url", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employees", "profile_photo_url", { type: Sequelize.STRING, allowNull: true });

  // ─── Employers: add missing columns ──────────────────────
  await qi.addColumn("employers", "first_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employers", "last_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employers", "date_of_birth", { type: Sequelize.DATEONLY, allowNull: true });
  await qi.addColumn("employers", "website", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employers", "cro_number", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employers", "employer_number", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("employers", "profile_data", { type: Sequelize.JSONB, allowNull: true });
  await qi.addColumn("employers", "profile_completed", { type: Sequelize.BOOLEAN, defaultValue: false });
}

export async function down(qi) {
  // Employees
  const empCols = [
    "first_name", "last_name", "address", "desired_job_type", "desired_location",
    "availability", "is_searchable", "work_experience", "education", "cv_url", "profile_photo_url",
  ];
  for (const col of empCols) {
    await qi.removeColumn("employees", col).catch(() => {});
  }

  // Employers
  const erCols = [
    "first_name", "last_name", "date_of_birth", "website",
    "cro_number", "employer_number", "profile_data", "profile_completed",
  ];
  for (const col of erCols) {
    await qi.removeColumn("employers", col).catch(() => {});
  }
}
