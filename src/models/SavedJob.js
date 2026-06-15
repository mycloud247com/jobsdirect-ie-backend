export default (sequelize, Sequelize) => {
  const SavedJob = sequelize.define("SavedJob", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    job_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
  }, { tableName: "saved_jobs", updatedAt: false });

  SavedJob.associate = (models) => {
    SavedJob.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    SavedJob.belongsTo(models.Job, { foreignKey: "job_id", as: "job" });
  };

  return SavedJob;
};
