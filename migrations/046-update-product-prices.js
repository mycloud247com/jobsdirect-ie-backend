/**
 * Update product credit costs to match V1 spec:
 * - 1 Credit = €1, no fractional credits
 * - Highlight: 5 credits (€5)
 * - Urgent: 5 credits (€5)
 * - Auto-renew: 5 credits (€5)
 * - Import: 0 (free)
 * - Duplicate: 0 (free)
 * - Featured: disabled
 *
 * Products are stored in site_settings JSONB, not a separate table.
 */
export async function up(qi) {
  // Products live inside site_settings.value.products (JSONB)
  const [rows] = await qi.sequelize.query(
    `SELECT id, value FROM site_settings WHERE key = 'site_settings' LIMIT 1`
  );
  if (!rows.length) return;

  const row = rows[0];
  const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  if (!Array.isArray(value.products)) return;

  const updates = {
    addon_highlight: { credit_cost: 5 },
    addon_urgent: { credit_cost: 5 },
    addon_auto_renew: { credit_cost: 5 },
    addon_import: { credit_cost: 0 },
    addon_duplicate: { credit_cost: 0 },
    addon_featured: { credit_cost: 0.5, enabled: false },
  };

  for (const product of value.products) {
    if (updates[product.id]) {
      Object.assign(product, updates[product.id]);
    }
  }

  await qi.sequelize.query(
    `UPDATE site_settings SET value = :value WHERE key = 'site_settings'`,
    { replacements: { value: JSON.stringify(value) } }
  );
}

export async function down() {
  // No rollback — prices are managed via admin CMS
}
