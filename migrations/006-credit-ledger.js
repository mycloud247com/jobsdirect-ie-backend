export async function up(qi, Sequelize) {
  await qi.createTable("credit_ledger", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    employer_id: { type: Sequelize.UUID, allowNull: false, references: { model: "employers", key: "id" } },
    action: { type: Sequelize.STRING, allowNull: false },
    amount: { type: Sequelize.FLOAT, allowNull: false },
    balance_after: { type: Sequelize.FLOAT, allowNull: false },
    reason: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.STRING, allowNull: true },
    job_id: { type: Sequelize.UUID, allowNull: true },
    stripe_session_id: { type: Sequelize.STRING, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });
}

export async function down(qi) {
  await qi.dropTable("credit_ledger");
}
