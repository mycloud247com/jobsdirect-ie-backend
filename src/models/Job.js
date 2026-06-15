export default (sequelize, Sequelize) => {
  const Job = sequelize.define("Job", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    short_description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    location_full: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    city_town: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING,
      defaultValue: "Ireland",
    },
    job_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    category: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salary_min: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salary_max: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salary_period: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salary_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    benefits: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    company_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("draft", "unpaid", "pending_review", "flagged", "approved", "rejected", "suspended", "deleted"),
      defaultValue: "pending_review",
    },
    moderation_result: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    slug: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
    requirements: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    source: {
      type: Sequelize.STRING,
      defaultValue: "manual",
    },
    source_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    application_email: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    application_method: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    application_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    hours_per_week: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    positions_count: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    career_level: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    created_by: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    payment_stripe_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    credit_log_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    approved_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    listing_type: {
      type: Sequelize.STRING,
      defaultValue: "paid",
    },
    listing_duration: {
      type: Sequelize.INTEGER,
      defaultValue: 28,
    },
    credits_charged: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    views_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    external_clicks: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    duplicate_of: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    contract_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    remote_work_mode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    sector: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    branch_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    job_start_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    cv_required: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    profile_data: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
  }, { tableName: "jobs" });

  Job.associate = (models) => {
    Job.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
    Job.hasMany(models.Application, { foreignKey: "job_id", as: "applications" });
    Job.hasMany(models.JobAddon, { foreignKey: "job_id", as: "addons" });
  };

  return Job;
};
