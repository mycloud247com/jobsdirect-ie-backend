export default (sequelize, Sequelize) => {
  const PageContent = sequelize.define("PageContent", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
  }, { tableName: "page_contents" });

  return PageContent;
};
