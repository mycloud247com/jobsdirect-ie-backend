export async function up(qi, Sequelize) {
  // 1. Add status column to job_addons
  await qi.addColumn("job_addons", "status", {
    type: Sequelize.STRING,
    defaultValue: "active",
    allowNull: false,
  });

  // 2. Migrate legacy boolean flags to job_addons rows
  const [jobs] = await qi.sequelize.query(`
    SELECT id, is_featured, is_highlighted, is_duplicate, is_imported
    FROM jobs
    WHERE is_featured = true OR is_highlighted = true OR is_duplicate = true OR is_imported = true
  `);

  for (const job of jobs) {
    const addons = [];
    if (job.is_featured) addons.push({ productId: "addon_featured", creditCost: 0.5 });
    if (job.is_highlighted) addons.push({ productId: "addon_highlight", creditCost: 0.5 });
    if (job.is_duplicate) addons.push({ productId: "addon_duplicate", creditCost: 1 });
    if (job.is_imported) addons.push({ productId: "addon_import", creditCost: 1 });

    for (const addon of addons) {
      // Check if already migrated
      const [existing] = await qi.sequelize.query(
        `SELECT id FROM job_addons WHERE job_id = :jobId AND product_id = :productId`,
        { replacements: { jobId: job.id, productId: addon.productId } },
      );
      if (existing.length === 0) {
        await qi.sequelize.query(
          `INSERT INTO job_addons (id, job_id, product_id, credit_cost, status, created_at) VALUES (gen_random_uuid(), :jobId, :productId, :creditCost, 'active', NOW())`,
          { replacements: { jobId: job.id, productId: addon.productId, creditCost: addon.creditCost } },
        );
      }
    }
  }

  // 3. Remove legacy boolean columns from jobs
  await qi.removeColumn("jobs", "is_featured");
  await qi.removeColumn("jobs", "is_highlighted");
  await qi.removeColumn("jobs", "is_duplicate");
  await qi.removeColumn("jobs", "is_imported");
}

export async function down(qi, Sequelize) {
  // Re-add boolean columns
  await qi.addColumn("jobs", "is_featured", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("jobs", "is_highlighted", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("jobs", "is_duplicate", { type: Sequelize.BOOLEAN, defaultValue: false });
  await qi.addColumn("jobs", "is_imported", { type: Sequelize.BOOLEAN, defaultValue: false });

  // Remove status column
  await qi.removeColumn("job_addons", "status");
}
