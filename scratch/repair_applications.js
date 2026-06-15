import "dotenv/config";
import DB from "../config/database.js";

async function repair() {
  const db = new DB();
  await db.initiate();
  console.log("Database connected.");

  const applications = await db.Application.findAll({
    where: { employerId: null },
    include: [{ model: db.Job, as: "job" }],
  });

  console.log(`Found ${applications.length} applications missing employerId.`);

  for (const app of applications) {
    if (app.job?.employerId) {
      console.log(`Updating application ${app.id} with employerId ${app.job.employerId}...`);
      await app.update({ employerId: app.job.employerId });
    } else {
      console.log(`Warning: Application ${app.id} has no valid job/employer link.`);
    }
  }

  console.log("Repair complete.");
  await db.close();
}

repair().catch(console.error);
