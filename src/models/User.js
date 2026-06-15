export default (sequelize, Sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    role: {
      type: Sequelize.ENUM("employee", "employer", "admin"),
      defaultValue: "employee",
    },
    status: {
      type: Sequelize.ENUM("active", "suspended"),
      defaultValue: "active",
    },
    email_verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    verification_token: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    reset_token: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    reset_token_expiry: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    google_id: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    },
  }, { tableName: "users" });

  User.associate = (models) => {
    User.hasOne(models.Employer, { foreignKey: "user_id", as: "employer" });
    User.hasOne(models.Employee, { foreignKey: "user_id", as: "employee" });
    User.hasMany(models.Application, { foreignKey: "user_id", as: "applications" });
    User.hasMany(models.Payment, { foreignKey: "user_id", as: "payments" });
  };

  return User;
};
