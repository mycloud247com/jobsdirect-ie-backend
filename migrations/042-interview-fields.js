/**
 * Add structured application action fields:
 * - Interview invite: date, time, type, location, meeting link, notes
 * - Ask for info: employer request message
 */
export async function up(qi, Sequelize) {
  await qi.addColumn("applications", "interview_date", { type: Sequelize.DATEONLY, allowNull: true });
  await qi.addColumn("applications", "interview_time", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "interview_type", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "interview_location", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "interview_meeting_link", { type: Sequelize.STRING, allowNull: true });
  await qi.addColumn("applications", "interview_notes", { type: Sequelize.TEXT, allowNull: true });
  await qi.addColumn("applications", "employer_request_message", { type: Sequelize.TEXT, allowNull: true });
}

export async function down(qi) {
  await qi.removeColumn("applications", "interview_date");
  await qi.removeColumn("applications", "interview_time");
  await qi.removeColumn("applications", "interview_type");
  await qi.removeColumn("applications", "interview_location");
  await qi.removeColumn("applications", "interview_meeting_link");
  await qi.removeColumn("applications", "interview_notes");
  await qi.removeColumn("applications", "employer_request_message");
}
