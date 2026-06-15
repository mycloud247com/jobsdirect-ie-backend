export default (sequelize, Sequelize) => {
  const Message = sequelize.define("Message", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    room_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    sender_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  }, { tableName: "messages", updatedAt: false });

  Message.associate = (models) => {
    Message.belongsTo(models.ChatRoom, { foreignKey: "room_id", as: "room" });
    Message.belongsTo(models.User, { foreignKey: "sender_id", as: "sender" });
  };

  return Message;
};
