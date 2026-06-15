/**
 * Normalise camelCase product keys in site_settings JSONB to snake_case.
 * The seed file already uses snake_case, but the admin UI may have written
 * creditCost / stripeProductId / cvPlanTier in camelCase.
 */
export async function up(qi) {
  await qi.sequelize.query(`
    UPDATE site_settings
    SET value = jsonb_set(
      value,
      '{products}',
      (
        SELECT COALESCE(jsonb_agg(
          (p - 'creditCost' - 'stripeProductId' - 'cvPlanTier')
          || jsonb_build_object(
            'credit_cost',        COALESCE(p->'creditCost', p->'credit_cost', 'null'::jsonb),
            'stripe_product_id',  COALESCE(p->'stripeProductId', p->'stripe_product_id', '""'::jsonb),
            'cv_plan_tier',       COALESCE(p->'cvPlanTier', p->'cv_plan_tier', 'null'::jsonb)
          )
        ), '[]'::jsonb)
        FROM jsonb_array_elements(value->'products') p
      )
    )
    WHERE key = 'site_settings'
      AND value->'products' IS NOT NULL;
  `);
}

export async function down(qi) {
  await qi.sequelize.query(`
    UPDATE site_settings
    SET value = jsonb_set(
      value,
      '{products}',
      (
        SELECT COALESCE(jsonb_agg(
          (p - 'credit_cost' - 'stripe_product_id' - 'cv_plan_tier')
          || jsonb_build_object(
            'creditCost',        COALESCE(p->'credit_cost', p->'creditCost', 'null'::jsonb),
            'stripeProductId',   COALESCE(p->'stripe_product_id', p->'stripeProductId', '""'::jsonb),
            'cvPlanTier',        COALESCE(p->'cv_plan_tier', p->'cvPlanTier', 'null'::jsonb)
          )
        ), '[]'::jsonb)
        FROM jsonb_array_elements(value->'products') p
      )
    )
    WHERE key = 'site_settings'
      AND value->'products' IS NOT NULL;
  `);
}
