/**
 * Backfill Stripe product IDs for CV plan products in site_settings JSONB.
 */
export async function up(qi) {
  const mapping = {
    cv_professional: "prod_UREjoeACpGDju0",
    cv_premium: "prod_UREjrImZukRkIi",
  };

  for (const [productId, stripeId] of Object.entries(mapping)) {
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
                THEN p || jsonb_build_object('stripe_product_id', :stripeId)
                ELSE p
              END
            )
            FROM jsonb_array_elements(value->'products') p
          )
        )
      )
      WHERE key = 'site_settings'
        AND value->'products' IS NOT NULL;
    `, { replacements: { productId, stripeId } });
  }
}

export async function down(qi) {
  const ids = ["cv_professional", "cv_premium"];

  for (const productId of ids) {
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
                THEN p || jsonb_build_object('stripe_product_id', '')
                ELSE p
              END
            )
            FROM jsonb_array_elements(value->'products') p
          )
        )
      )
      WHERE key = 'site_settings'
        AND value->'products' IS NOT NULL;
    `, { replacements: { productId } });
  }
}
