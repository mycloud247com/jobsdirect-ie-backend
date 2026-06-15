/**
 * Clear all non-admin users (re-run after auth fix).
 */
export async function up(qi) {
  const [users] = await qi.sequelize.query(`SELECT id FROM users WHERE role != 'admin'`);
  if (!users.length) return;
  const userIds = users.map(u => `'${u.id}'`).join(",");
  const [employers] = await qi.sequelize.query(`SELECT id FROM employers WHERE user_id IN (${userIds})`);
  const employerIds = employers.length ? employers.map(e => `'${e.id}'`).join(",") : null;

  if (employerIds) {
    await qi.sequelize.query(`DELETE FROM messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE employer_id IN (${employerIds}))`);
    await qi.sequelize.query(`DELETE FROM chat_rooms WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM job_addons WHERE job_id IN (SELECT id FROM jobs WHERE employer_id IN (${employerIds}))`);
    await qi.sequelize.query(`DELETE FROM application_documents WHERE application_id IN (SELECT id FROM applications WHERE employer_id IN (${employerIds}))`);
    await qi.sequelize.query(`DELETE FROM applications WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM credit_ledger WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM payments WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM jobs WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM employer_team_members WHERE employer_id IN (${employerIds})`);
    await qi.sequelize.query(`DELETE FROM employers WHERE id IN (${employerIds})`);
  }
  await qi.sequelize.query(`DELETE FROM messages WHERE sender_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM chat_rooms WHERE candidate_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM application_documents WHERE application_id IN (SELECT id FROM applications WHERE user_id IN (${userIds}))`);
  await qi.sequelize.query(`DELETE FROM applications WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM saved_jobs WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM job_alerts WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM notifications WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM cvs WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM invoices WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM employees WHERE user_id IN (${userIds})`);
  await qi.sequelize.query(`DELETE FROM users WHERE id IN (${userIds})`);
}
export async function down() {}
