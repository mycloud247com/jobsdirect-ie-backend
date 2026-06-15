/**
 * Expand credit system: cent-based credits, free job tracking, job expiry.
 */
export async function up(qi, Sequelize) {
  // Employers: track free job usage, keep credits as integer (now represents cents)
  await qi.addColumn("employers", "last_free_job_at", { type: Sequelize.DATE, allowNull: true });

  // Jobs: add expiry and pricing metadata
  await qi.addColumn("jobs", "expires_at", { type: Sequelize.DATE, allowNull: true });
  await qi.addColumn("jobs", "listing_type", { type: Sequelize.STRING, allowNull: true, defaultValue: "paid" }); // free / paid
  await qi.addColumn("jobs", "listing_duration", { type: Sequelize.INTEGER, allowNull: true, defaultValue: 28 }); // days
  await qi.addColumn("jobs", "credits_charged", { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 }); // cents charged
  await qi.addColumn("jobs", "is_duplicate", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("jobs", "duplicate_of", { type: Sequelize.UUID, allowNull: true });
  await qi.addColumn("jobs", "is_imported", { type: Sequelize.BOOLEAN, defaultValue: false });
}

export async function down(qi) {
  const cols = ["last_free_job_at"];
  for (const col of cols) await qi.removeColumn("employers", col).catch(() => {});

  const jobCols = ["expires_at", "listing_type", "listing_duration", "credits_charged", "is_duplicate", "duplicate_of", "is_imported"];
  for (const col of jobCols) await qi.removeColumn("jobs", col).catch(() => {});
}
