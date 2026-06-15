export async function up(qi, Sequelize) {
  await qi.createTable("chat_rooms", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    application_id: { type: Sequelize.UUID, allowNull: false, references: { model: "applications", key: "id" } },
    employer_id: { type: Sequelize.UUID, allowNull: false },
    candidate_id: { type: Sequelize.UUID, allowNull: false },
    status: { type: Sequelize.STRING, defaultValue: "active" },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });

  await qi.createTable("messages", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    room_id: { type: Sequelize.UUID, allowNull: false, references: { model: "chat_rooms", key: "id" }, onDelete: "CASCADE" },
    sender_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" } },
    message: { type: Sequelize.TEXT, allowNull: false },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });

  await qi.addIndex("messages", ["room_id"]);
  await qi.addIndex("chat_rooms", ["application_id"], { unique: true });
}

export async function down(qi) {
  await qi.dropTable("messages");
  await qi.dropTable("chat_rooms");
}
