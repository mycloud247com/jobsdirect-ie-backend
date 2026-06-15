/**
 * Enable location_full field in employer job form config.
 */
export async function up(qi) {
  await qi.sequelize.query(`
    UPDATE site_settings
    SET value = jsonb_set(
      value,
      '{employer_job_form_config,location_full}',
      '{"visible": true, "required": false}'::jsonb
    )
    WHERE key = 'site_settings'
      AND value->'employer_job_form_config' IS NOT NULL;
  `);
}

export async function down(qi) {
  await qi.sequelize.query(`
    UPDATE site_settings
    SET value = jsonb_set(
      value,
      '{employer_job_form_config,location_full}',
      '{"visible": false, "required": false}'::jsonb
    )
    WHERE key = 'site_settings'
      AND value->'employer_job_form_config' IS NOT NULL;
  `);
}
