/**
 * Add SEO-friendly slug field to jobs (§6)
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("jobs", "slug", {
    type: Sequelize.STRING,
    allowNull: true,
    unique: true,
  });
}

export async function down(qi) {
  await qi.removeColumn("jobs", "slug");
}
