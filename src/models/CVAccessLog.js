export default (sequelize, Sequelize) => {
  const CVAccessLog = sequelize.define("CVAccessLog", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    cv_id: { type: Sequelize.UUID, allowNull: true },
    candidate_id: { type: Sequelize.UUID, allowNull: false },
    employer_id: { type: Sequelize.UUID, allowNull: false },
    accessed_by: { type: Sequelize.UUID, allowNull: false },
    action: { type: Sequelize.STRING, allowNull: false },
    application_id: { type: Sequelize.UUID, allowNull: true },
  }, { tableName: "cv_access_logs", updatedAt: false });

  return CVAccessLog;
};
