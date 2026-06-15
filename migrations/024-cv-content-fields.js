export async function up(queryInterface, Sequelize) {
  // Per-CV content fields — each CV can have its own tailored content
  await queryInterface.addColumn("cvs", "title", { type: Sequelize.STRING, allowNull: true });
  await queryInterface.addColumn("cvs", "bio", { type: Sequelize.TEXT, allowNull: true });
  await queryInterface.addColumn("cvs", "skills", { type: Sequelize.TEXT, allowNull: true });
  await queryInterface.addColumn("cvs", "work_experience", { type: Sequelize.JSONB, allowNull: true });
  await queryInterface.addColumn("cvs", "education", { type: Sequelize.JSONB, allowNull: true });
  await queryInterface.addColumn("cvs", "certifications", { type: Sequelize.JSONB, allowNull: true });
  await queryInterface.addColumn("cvs", "projects", { type: Sequelize.JSONB, allowNull: true });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("cvs", "title");
  await queryInterface.removeColumn("cvs", "bio");
  await queryInterface.removeColumn("cvs", "skills");
  await queryInterface.removeColumn("cvs", "work_experience");
  await queryInterface.removeColumn("cvs", "education");
  await queryInterface.removeColumn("cvs", "certifications");
  await queryInterface.removeColumn("cvs", "projects");
}
