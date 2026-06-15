export default (sequelize, Sequelize) => {
  const Payment = sequelize.define("Payment", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    stripe_session_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    stripe_customer_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    stripe_subscription_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    plan_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    kind: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    credits: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    amount_total: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    currency: {
      type: Sequelize.STRING,
      defaultValue: "eur",
    },
    mode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: "checkout_created",
    },
    payment_status: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    checkout_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    fulfilled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
  }, { tableName: "payments" });

  Payment.associate = (models) => {
    Payment.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Payment.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
  };

  return Payment;
};
