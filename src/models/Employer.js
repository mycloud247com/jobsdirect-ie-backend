export default (sequelize, Sequelize) => {
  const Employer = sequelize.define("Employer", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    date_of_birth: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    company_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    website: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cro_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    employer_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    business_address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    verification_status: {
      type: Sequelize.ENUM("draft", "pending", "submitted", "under_review", "approved", "rejected"),
      defaultValue: "draft",
    },
    approval_submitted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    approved_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    admin_review_note: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    credits: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    candidate_database_access: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    candidate_database_status: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    candidate_database_subscription_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    candidate_database_started_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    candidate_database_cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    stripe_customer_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    profile_data: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    profile_completed: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    last_free_job_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    verification_doc_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    verification_doc_key: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  }, { tableName: "employers" });

  Employer.associate = (models) => {
    Employer.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Employer.hasMany(models.Job, { foreignKey: "employer_id", as: "jobs" });
    Employer.hasMany(models.EmployerTeamMember, { foreignKey: "employer_id", as: "teamMembers" });
  };

  return Employer;
};
