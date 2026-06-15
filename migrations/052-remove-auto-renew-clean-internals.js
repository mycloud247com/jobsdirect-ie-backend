/**
 * Remove addon_auto_renew from products.
 * Mark addon_import and addon_duplicate as type "internal" (not purchasable addons).
 */
export async function up(qi) {
  const [rows] = await qi.sequelize.query(
    `SELECT id, value FROM site_settings WHERE key = 'site_settings' LIMIT 1`
  );
  if (!rows.length) return;
  const row = rows[0];
  const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  if (!Array.isArray(value.products)) return;

  // Remove auto_renew entirely
  value.products = value.products.filter(p => p.id !== "addon_auto_renew");

  // Mark import and duplicate as internal
  for (const p of value.products) {
    if (p.id === "addon_import" || p.id === "addon_duplicate") {
      p.type = "internal";
    }
  }

  await qi.sequelize.query(
    `UPDATE site_settings SET value = :value WHERE key = 'site_settings'`,
    { replacements: { value: JSON.stringify(value) } }
  );

  // Deactivate any existing auto_renew job addons
  await qi.sequelize.query(`UPDATE job_addons SET status = 'inactive' WHERE product_id = 'addon_auto_renew'`);
}

export async function down() {}
