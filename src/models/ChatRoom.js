export default (sequelize, Sequelize) => {
  const ChatRoom = sequelize.define("ChatRoom", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    application_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    candidate_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: "active",
    },
  }, { tableName: "chat_rooms" });

  ChatRoom.associate = (models) => {
    ChatRoom.belongsTo(models.Application, { foreignKey: "application_id", as: "application" });
    ChatRoom.belongsTo(models.User, { foreignKey: "candidate_id", as: "candidate" });
    ChatRoom.hasMany(models.Message, { foreignKey: "room_id", as: "messages" });
  };

  return ChatRoom;
};
