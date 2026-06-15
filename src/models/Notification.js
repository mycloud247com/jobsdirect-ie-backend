export default (sequelize, Sequelize) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: "info",
    },
    is_read: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    link: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  }, { tableName: "notifications" });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return Notification;
};
