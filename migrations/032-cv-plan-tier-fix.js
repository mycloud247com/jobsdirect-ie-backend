/**
 * 1. Add cv_plan_tier to CV plan products in site_settings JSONB.
 * 2. Fix employee records that have "cv_professional"/"cv_premium" instead of "professional"/"premium".
 */
export async function up(qi) {
  // 1. Backfill cv_plan_tier in product catalog
  const mapping = {
    cv_professional: "professional",
    cv_premium: "premium",
  };

  for (const [productId, tier] of Object.entries(mapping)) {
    await qi.sequelize.query(`
      UPDATE site_settings
      SET value = (
        SELECT jsonb_set(
          value,
          '{products}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN p->>'id' = :productId
                THEN p || jsonb_build_object('cv_plan_tier', :tier)
                ELSE p
              END
            )
            FROM jsonb_array_elements(value->'products') p
          )
        )
      )
      WHERE key = 'site_settings'
        AND value->'products' IS NOT NULL;
    `, { replacements: { productId, tier } });
  }

  // 2. Fix employee records with wrong cv_plan values
  await qi.sequelize.query(`UPDATE employees SET cv_plan = 'professional' WHERE cv_plan = 'cv_professional';`);
  await qi.sequelize.query(`UPDATE employees SET cv_plan = 'premium' WHERE cv_plan = 'cv_premium';`);
}

export async function down(qi) {
  // Revert employee records
  await qi.sequelize.query(`UPDATE employees SET cv_plan = 'cv_professional' WHERE cv_plan = 'professional';`);
  await qi.sequelize.query(`UPDATE employees SET cv_plan = 'cv_premium' WHERE cv_plan = 'premium';`);
}
