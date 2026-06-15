export async function up(qi, Sequelize) {
  await qi.createTable("application_documents", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    application_id: { type: Sequelize.UUID, allowNull: false, references: { model: "applications", key: "id" }, onDelete: "CASCADE" },
    name: { type: Sequelize.STRING, allowNull: false },
    type: { type: Sequelize.STRING, allowNull: false, defaultValue: "cv" },
    file_name: { type: Sequelize.STRING, allowNull: true },
    file_path: { type: Sequelize.STRING, allowNull: true },
    file_url: { type: Sequelize.STRING, allowNull: true },
    mime_type: { type: Sequelize.STRING, allowNull: true },
    file_size: { type: Sequelize.INTEGER, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
  await qi.addIndex("application_documents", ["application_id"]);
}

export async function down(qi) {
  await qi.dropTable("application_documents");
}
