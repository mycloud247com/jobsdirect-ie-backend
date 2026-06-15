export async function up(qi, Sequelize) {
  await qi.createTable("job_addons", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    job_id: { type: Sequelize.UUID, allowNull: false, references: { model: "jobs", key: "id" }, onDelete: "CASCADE" },
    product_id: { type: Sequelize.STRING, allowNull: false },
    credit_cost: { type: Sequelize.FLOAT, defaultValue: 0 },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
  await qi.addIndex("job_addons", ["job_id"]);
}

export async function down(qi) {
  await qi.dropTable("job_addons");
}
