/**
 * Add missing fields to jobs table
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "contract_type", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("jobs", "remote_work_mode", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("jobs", "sector", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("jobs", "branch_name", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("jobs", "job_start_date", { type: Sequelize.DATE, allowNull: true });
  await qi.addColumn("jobs", "cv_required", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("jobs", "profile_data", { type: Sequelize.JSONB, allowNull: true });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "contract_type");
  await qi.removeColumn("jobs", "remote_work_mode");
  await qi.removeColumn("jobs", "sector");
  await qi.removeColumn("jobs", "branch_name");
  await qi.removeColumn("jobs", "job_start_date");
  await qi.removeColumn("jobs", "cv_required");
  await qi.removeColumn("jobs", "profile_data");
}
