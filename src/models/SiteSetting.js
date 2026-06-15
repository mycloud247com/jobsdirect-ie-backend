export default (sequelize, Sequelize) => {
  const SiteSetting = sequelize.define("SiteSetting", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: Sequelize.JSONB,
      allowNull: false,
    },
  }, { tableName: "site_settings" });

  return SiteSetting;
};
