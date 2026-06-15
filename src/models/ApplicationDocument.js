export default (sequelize, Sequelize) => {
  const ApplicationDocument = sequelize.define("ApplicationDocument", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    application_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "cv",
    },
    file_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_path: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_url: {
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
  }, { tableName: "application_documents" });

  ApplicationDocument.associate = (models) => {
    ApplicationDocument.belongsTo(models.Application, { foreignKey: "application_id", as: "application" });
  };

  return ApplicationDocument;
};
