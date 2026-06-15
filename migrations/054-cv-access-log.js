/**
 * Log CV views and downloads by employers (GDPR §35)
 */
export async function up(qi, Sequelize) {
  await qi.createTable("cv_access_logs", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    cv_id: { type: Sequelize.UUID, allowNull: true },
    candidate_id: { type: Sequelize.UUID, allowNull: false },
    employer_id: { type: Sequelize.UUID, allowNull: false },
    accessed_by: { type: Sequelize.UUID, allowNull: false },
    action: { type: Sequelize.STRING, allowNull: false }, // 'view' or 'download'
    application_id: { type: Sequelize.UUID, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  });
}

export async function down(qi) {
  await qi.dropTable("cv_access_logs");
}
