/**
 * Strip form configs to only spec-required fields.
 * Removes all extra fields from employer, employee, and candidate view configs.
 */
export async function up(qi) {
  const [rows] = await qi.sequelize.query(
    `SELECT id, value FROM site_settings WHERE key = 'site_settings' LIMIT 1`
  );
  if (!rows.length) return;

  const row = rows[0];
  const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;

  value.employer_company_form_config = {
    first_name: { visible: true, required: true },
    last_name: { visible: true, required: true },
    company_name: { visible: true, required: true },
    employer_number: { visible: true, required: true },
    cro_number: { visible: true, required: false },
    phone: { visible: true, required: true },
    website: { visible: true, required: false },
    address_building: { visible: true, required: false },
    address_town: { visible: true, required: false },
    address_county: { visible: true, required: false },
    address_eircode: { visible: true, required: false },
  };

  value.employee_profile_form_config = {
    first_name: { visible: true, required: true },
    last_name: { visible: true, required: true },
    phone: { visible: true, required: false },
    county: { visible: true, required: false },
    right_to_work: { visible: true, required: false },
    driving_licence: { visible: true, required: false },
    languages: { visible: true, required: false },
    skills: { visible: true, required: false },
    work_experience: { visible: true, required: false },
    education: { visible: true, required: false },
    desired_job_type: { visible: true, required: false },
    desired_location: { visible: true, required: false },
    availability: { visible: true, required: false },
    expected_salary: { visible: true, required: false },
    salary_period: { visible: true, required: false },
    experience_years: { visible: true, required: false },
    is_searchable: { visible: true, required: false },
  };

  value.employee_candidate_view_config = {
    first_name: { visible: true },
    last_name: { visible: true },
    phone: { visible: false },
    county: { visible: true },
    right_to_work: { visible: true },
    driving_licence: { visible: true },
    languages: { visible: true },
    skills: { visible: true },
    work_experience: { visible: true },
    education: { visible: true },
    desired_job_type: { visible: true },
    desired_location: { visible: true },
    availability: { visible: true },
    expected_salary: { visible: true },
    salary_period: { visible: true },
    experience_years: { visible: true },
    is_searchable: { visible: true },
  };

  await qi.sequelize.query(
    `UPDATE site_settings SET value = :value WHERE key = 'site_settings'`,
    { replacements: { value: JSON.stringify(value) } }
  );
}

export async function down() {}
