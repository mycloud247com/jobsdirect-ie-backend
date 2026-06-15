/**
 * Strip job form config to only spec §3.2 fields.
 */
export async function up(qi) {
  const [rows] = await qi.sequelize.query(
    `SELECT id, value FROM site_settings WHERE key = 'site_settings' LIMIT 1`
  );
  if (!rows.length) return;
  const row = rows[0];
  const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;

  value.employer_job_form_config = {
    location: { visible: true, required: true },
    sector: { visible: true, required: false },
    job_type: { visible: true, required: false },
    remote_work_mode: { visible: true, required: false },
    title: { visible: true, required: true },
    description: { visible: true, required: true },
    salary_min: { visible: true, required: false },
    salary_max: { visible: true, required: false },
    salary_period: { visible: true, required: false },
    requirements: { visible: true, required: false },
    application_method: { visible: true, required: false },
    application_url: { visible: false, required: false },
  };

  await qi.sequelize.query(
    `UPDATE site_settings SET value = :value WHERE key = 'site_settings'`,
    { replacements: { value: JSON.stringify(value) } }
  );
}
export async function down() {}
