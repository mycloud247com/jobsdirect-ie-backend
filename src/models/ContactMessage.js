export default (sequelize, Sequelize) => {
  const ContactMessage = sequelize.define("ContactMessage", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    subject: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("new", "read", "replied", "archived"),
      defaultValue: "new",
    },
  }, { tableName: "contact_messages" });

  return ContactMessage;
};
