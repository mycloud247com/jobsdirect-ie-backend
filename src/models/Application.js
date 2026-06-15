export default (sequelize, Sequelize) => {
  const Application = sequelize.define("Application", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    job_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true, // nullable for guest applications
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM("pending", "submitted", "viewed", "shortlisted", "contacted", "interview", "rejected", "hired", "closed"),
      defaultValue: "submitted",
    },
    cover_letter: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    is_guest: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    guest_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    guest_email: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    guest_phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    guest_county: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    guest_country: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cv_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cv_file_key: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    // Structured application actions (§12)
    interview_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    interview_time: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    interview_type: {
      type: Sequelize.STRING, // 'physical' or 'virtual'
      allowNull: true,
    },
    interview_location: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    interview_meeting_link: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    interview_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    employer_request_message: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  }, { tableName: "applications" });

  Application.associate = (models) => {
    Application.belongsTo(models.Job, { foreignKey: "job_id", as: "job" });
    Application.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Application.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
    Application.hasMany(models.ApplicationDocument, { foreignKey: "application_id", as: "documents" });
  };

  return Application;
};
