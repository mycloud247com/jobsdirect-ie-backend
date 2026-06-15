export default (sequelize, Sequelize) => {
  const EmployerTeamMember = sequelize.define("EmployerTeamMember", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true, // null until invite is accepted
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    role: {
      type: Sequelize.STRING,
      defaultValue: "recruiter", // owner, admin, recruiter
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending", // pending, active, removed
    },
    invite_token: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    invited_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    accepted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, { tableName: "employer_team_members" });

  EmployerTeamMember.associate = (models) => {
    EmployerTeamMember.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
    EmployerTeamMember.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return EmployerTeamMember;
};
