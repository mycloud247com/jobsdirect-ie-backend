export async function up(qi, Sequelize) {
  await qi.createTable("saved_jobs", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    job_id: { type: Sequelize.UUID, allowNull: false, references: { model: "jobs", key: "id" }, onDelete: "CASCADE" },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
  await qi.addIndex("saved_jobs", ["user_id", "job_id"], { unique: true });
}

export async function down(qi) {
  await qi.dropTable("saved_jobs");
}
