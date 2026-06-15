export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("job_alerts", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    keyword: { type: Sequelize.STRING, allowNull: true },
    location: { type: Sequelize.STRING, allowNull: true },
    category: { type: Sequelize.STRING, allowNull: true },
    job_type: { type: Sequelize.STRING, allowNull: true },
    frequency: { type: Sequelize.STRING, defaultValue: "daily" },
    is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
    last_sent_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("job_alerts");
}
