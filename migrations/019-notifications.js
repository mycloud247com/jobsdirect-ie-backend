export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("notifications", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
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
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("notifications");
};
