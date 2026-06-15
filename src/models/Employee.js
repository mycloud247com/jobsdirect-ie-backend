export default (sequelize, Sequelize) => {
  const Employee = sequelize.define("Employee", {
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
    title: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bio: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    profile_completed: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    skills: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    experience_years: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    date_of_birth: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    desired_job_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    desired_location: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    availability: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    is_searchable: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    work_experience: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    education: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    right_to_work: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    driving_licence: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    languages: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    county: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING,
      defaultValue: "Ireland",
    },
    cv_plan: {
      type: Sequelize.STRING,
      defaultValue: "free", // free, professional, premium
    },
    cv_plan_purchased_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    // New fields
    linkedin: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    website: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    portfolio_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    github: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    nationality: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    gender: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expected_salary: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salary_period: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    projects: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    certifications: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    profile_photo_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    cv_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  }, { tableName: "employees" });
 
  Employee.associate = (models) => {
    Employee.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return Employee;
};
