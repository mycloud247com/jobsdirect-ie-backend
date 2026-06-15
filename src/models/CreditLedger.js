export default (sequelize, Sequelize) => {
  const CreditLedger = sequelize.define("CreditLedger", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    action: {
      type: Sequelize.STRING,
      allowNull: false, // "credit" or "debit"
    },
    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    balance_after: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    reason: {
      type: Sequelize.STRING,
      allowNull: false, // "job_posting", "duplicate", "credit_purchase", "admin_adjustment", "refund"
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    job_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    stripe_session_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, { tableName: "credit_ledger", updatedAt: false });

  CreditLedger.associate = (models) => {
    CreditLedger.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
  };

  return CreditLedger;
};
