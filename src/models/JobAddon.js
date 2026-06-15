export default (sequelize, Sequelize) => {
  const JobAddon = sequelize.define("JobAddon", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    job_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    product_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    credit_cost: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: "active",
      allowNull: false,
    },
  }, { tableName: "job_addons", updatedAt: false });

  JobAddon.associate = (models) => {
    JobAddon.belongsTo(models.Job, { foreignKey: "job_id", as: "job" });
  };

  return JobAddon;
};
