export async function up(qi, Sequelize) {
  await qi.createTable("cvs", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    name: { type: Sequelize.STRING, allowNull: false, defaultValue: "My CV" },
    type: { type: Sequelize.STRING, allowNull: false, defaultValue: "uploaded" },
    file_name: { type: Sequelize.STRING, allowNull: true },
    file_path: { type: Sequelize.STRING, allowNull: true },
    mime_type: { type: Sequelize.STRING, allowNull: true },
    file_size: { type: Sequelize.INTEGER, allowNull: true },
    template_id: { type: Sequelize.STRING, allowNull: true },
    is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
  await qi.addIndex("cvs", ["user_id"]);
}

export async function down(qi) {
  await qi.dropTable("cvs");
}
