export const up = async (queryInterface, Sequelize) => {
  // Make application_id nullable
  await queryInterface.changeColumn("chat_rooms", "application_id", {
    type: Sequelize.UUID,
    allowNull: true,
  });

  // Ensure candidate_id exists (it might have been added by model sync but good to be sure)
  const tableInfo = await queryInterface.describeTable("chat_rooms");
  if (!tableInfo.candidate_id) {
    await queryInterface.addColumn("chat_rooms", "candidate_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Reverse is tricky if there are nulls, but for rollback:
  await queryInterface.changeColumn("chat_rooms", "application_id", {
    type: Sequelize.UUID,
    allowNull: false,
  });
};
