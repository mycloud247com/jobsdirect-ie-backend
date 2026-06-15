/**
 * Document request system for employer verification (§2.2)
 * Admin requests specific documents, employer uploads them.
 */
export async function up(qi, Sequelize) {
  await qi.createTable("document_requests", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    employer_id: { type: Sequelize.UUID, allowNull: false, references: { model: "employers", key: "id" }, onDelete: "CASCADE" },
    requested_by: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" } },
    title: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.TEXT, allowNull: true },
    status: { type: Sequelize.STRING, defaultValue: "pending" }, // pending, uploaded, approved, rejected
    file_url: { type: Sequelize.STRING, allowNull: true },
    file_key: { type: Sequelize.STRING, allowNull: true },
    admin_note: { type: Sequelize.TEXT, allowNull: true },
    uploaded_at: { type: Sequelize.DATE, allowNull: true },
    reviewed_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  });
}

export async function down(qi) {
  await qi.dropTable("document_requests");
}
