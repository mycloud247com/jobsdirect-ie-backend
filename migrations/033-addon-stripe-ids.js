/**
 * Backfill Stripe product IDs for urgent hiring and auto-renew addons.
 */
export async function up(qi) {
  const mapping = {
    addon_urgent: "prod_URVplG1urXuG30",
    addon_auto_renew: "prod_URVp6jvDYKcnTj",
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
  const ids = ["addon_urgent", "addon_auto_renew"];

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
