class SavedJobController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.db = context.db;
  }

  async list() {
    const saved = await this.db.SavedJob.findAll({
      where: { user_id: this.req.user.id },
      order: [["created_at", "DESC"]],
      include: [{
        model: this.db.Job,
        as: "job",
        include: [
          { model: this.db.Employer, as: "employer", attributes: ["id", "company_name"] },
          { model: this.db.JobAddon, as: "addons" },
        ],
      }],
    });
    return saved;
  }

  async toggle() {
    const final_job_id = this.req.body.job_id;
    if (!final_job_id) throw this.context.errorManager.getError("BAD_REQUEST", "job_id required");

    const existing = await this.db.SavedJob.findOne({
      where: { user_id: this.req.user.id, job_id: final_job_id },
    });

    if (existing) {
      await existing.destroy();
      return { saved: false };
    }

    await this.db.SavedJob.create({ user_id: this.req.user.id, job_id: final_job_id });
    return { saved: true };
  }

  async check() {
    const final_job_id = this.req.query.job_id;
    if (!final_job_id) return { saved: false };
    const existing = await this.db.SavedJob.findOne({
      where: { user_id: this.req.user.id, job_id: final_job_id },
    });
    return { saved: !!existing };
  }
}

export default SavedJobController;
