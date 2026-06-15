export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("employer_team_members", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    employer_id: { type: Sequelize.UUID, allowNull: false, references: { model: "employers", key: "id" }, onDelete: "CASCADE" },
    user_id: { type: Sequelize.UUID, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
    email: { type: Sequelize.STRING, allowNull: false },
    role: { type: Sequelize.STRING, defaultValue: "recruiter" },
    status: { type: Sequelize.STRING, defaultValue: "pending" },
    invite_token: { type: Sequelize.STRING, allowNull: true },
    invited_at: { type: Sequelize.DATE, allowNull: true },
    accepted_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
  });

  await queryInterface.addIndex("employer_team_members", ["employer_id", "email"], { unique: true });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("employer_team_members");
}
