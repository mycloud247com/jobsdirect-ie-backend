/**
 * Create invoices table for payment receipts (§18)
 */
export async function up(qi, Sequelize) {
  await qi.createTable("invoices", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    user_id: { type: Sequelize.UUID, allowNull: false },
    invoice_number: { type: Sequelize.STRING, allowNull: false, unique: true },
    date: { type: Sequelize.DATEONLY, allowNull: false },
    amount: { type: Sequelize.FLOAT, allowNull: false },
    vat_amount: { type: Sequelize.FLOAT, defaultValue: 0 },
    currency: { type: Sequelize.STRING, defaultValue: "EUR" },
    description: { type: Sequelize.TEXT, allowNull: false },
    payment_method: { type: Sequelize.STRING, defaultValue: "stripe" },
    stripe_session_id: { type: Sequelize.STRING, allowNull: true },
    kind: { type: Sequelize.STRING, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  });
}

export async function down(qi) {
  await qi.dropTable("invoices");
}
