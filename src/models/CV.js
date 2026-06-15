export default (sequelize, Sequelize) => {
  const CV = sequelize.define("CV", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "My CV",
    },
    type: {
      type: Sequelize.STRING, // "uploaded" | "generated_free" | "generated_pro" | "generated_premium"
      allowNull: false,
      defaultValue: "uploaded",
    },
    file_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_path: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mime_type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_size: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    template_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_key: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    is_default: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    // Per-CV content fields — tailored per CV
    title: { type: Sequelize.STRING, allowNull: true },
    bio: { type: Sequelize.TEXT, allowNull: true },
    skills: { type: Sequelize.TEXT, allowNull: true },
    work_experience: { type: Sequelize.JSONB, allowNull: true },
    education: { type: Sequelize.JSONB, allowNull: true },
    certifications: { type: Sequelize.JSONB, allowNull: true },
    projects: { type: Sequelize.JSONB, allowNull: true },
  }, { tableName: "cvs" });

  CV.associate = (models) => {
    CV.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return CV;
};
