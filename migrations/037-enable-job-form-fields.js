/**
 * Enable additional job form fields that the scraper populates.
 */
export async function up(qi) {
  const fieldsToEnable = [
    "contract_type",
    "career_level",
    "sector",
    "hours_per_week",
    "positions_count",
    "remote_work_mode",
    "country",
  ];

  for (const field of fieldsToEnable) {
    await qi.sequelize.query(`
      UPDATE site_settings
      SET value = jsonb_set(
        value,
        '{employer_job_form_config,${field}}',
        '{"visible": true, "required": false}'::jsonb
      )
      WHERE key = 'site_settings'
        AND value->'employer_job_form_config' IS NOT NULL;
    `);
  }
}

export async function down(qi) {
  const fieldsToDisable = [
    "contract_type",
    "career_level",
    "sector",
    "hours_per_week",
    "positions_count",
    "remote_work_mode",
    "country",
  ];

  for (const field of fieldsToDisable) {
    await qi.sequelize.query(`
      UPDATE site_settings
      SET value = jsonb_set(
        value,
        '{employer_job_form_config,${field}}',
        '{"visible": false, "required": false}'::jsonb
      )
      WHERE key = 'site_settings'
        AND value->'employer_job_form_config' IS NOT NULL;
    `);
  }
}
