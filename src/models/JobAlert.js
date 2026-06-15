export default (sequelize, Sequelize) => {
  const JobAlert = sequelize.define("JobAlert", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    keyword: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    category: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    job_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    frequency: {
      type: Sequelize.STRING,
      defaultValue: "daily", // daily, weekly
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    last_sent_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, { tableName: "job_alerts" });

  JobAlert.associate = (models) => {
    JobAlert.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return JobAlert;
};
