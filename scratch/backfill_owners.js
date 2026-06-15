import DB from "../config/database.js";
import dotenv from "dotenv";
dotenv.config();

async function backfill() {
  console.log("Backfilling owners into employer_team_members...");
  
  const db = new DB();
  await db.initiate();

  const employers = await db.Employer.findAll({
    include: [{ model: db.User, as: "user" }]
  });

  for (const employer of employers) {
    const existing = await db.EmployerTeamMember.findOne({
      where: { employerId: employer.id, userId: employer.userId }
    });

    if (!existing && employer.userId) {
      console.log(`Adding owner ${employer.user?.email} for employer ${employer.companyName}`);
      await db.EmployerTeamMember.create({
        employerId: employer.id,
        userId: employer.userId,
        email: employer.user?.email || "owner@example.com",
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      });
    }
  }

  console.log("Backfill complete.");
  await db.close();
  process.exit(0);
}

backfill().catch(err => {
  console.error(err);
  process.exit(1);
});
