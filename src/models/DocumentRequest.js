export default (sequelize, Sequelize) => {
  const DocumentRequest = sequelize.define("DocumentRequest", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    employer_id: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    requested_by: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending", // pending, uploaded, approved, rejected
    },
    file_url: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file_key: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    admin_note: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    uploaded_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, { tableName: "document_requests" });

  DocumentRequest.associate = (models) => {
    DocumentRequest.belongsTo(models.Employer, { foreignKey: "employer_id", as: "employer" });
    DocumentRequest.belongsTo(models.User, { foreignKey: "requested_by", as: "requestedBy" });
  };

  return DocumentRequest;
};
