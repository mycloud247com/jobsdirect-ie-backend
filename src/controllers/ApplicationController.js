import ApplicationService from "../services/application.js";

class ApplicationController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.applicationService = new ApplicationService(context);
  }

  async list() {
    return this.applicationService.list(this.req.query);
  }

  async create() {
    return this.applicationService.create(this.req.body, this.req.user);
  }

  async guestApply() {
    return this.applicationService.guestApply(this.req.body, this.req.file);
  }

  async update() {
    return this.applicationService.update(this.req.params.id, this.req.body);
  }

  async get() {
    const application = await this.applicationService.getById(this.req.params.id);

    // Auto-mark as "viewed" when employer opens an application still in "submitted" status
    const employer = await this.context.db.Employer.findOne({
      where: { user_id: this.req.user.id },
    });
    if (employer && application.status === "submitted") {
      await this.applicationService.update(this.req.params.id, { status: "viewed" });
      application.status = "viewed";
    }

    // Log CV access (GDPR §35)
    if (employer && application.user_id) {
      try {
        await this.context.db.CVAccessLog.create({
          candidate_id: application.user_id,
          employer_id: employer.id,
          accessed_by: this.req.user.id,
          action: "view",
          application_id: application.id,
        });
      } catch {}
    }

    return application;
  }

  async askForInfo() {
    const { message } = this.req.body;
    if (!message) throw this.context.errorManager.getError("BAD_REQUEST", "Message is required");
    return this.applicationService.askForInfo(this.req.params.id, message);
  }

  async inviteToInterview() {
    const { interview_date, interview_time, interview_type } = this.req.body;
    if (!interview_date || !interview_time || !interview_type) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Interview date, time, and type are required");
    }
    return this.applicationService.inviteToInterview(this.req.params.id, this.req.body);
  }

  async remove() {
    return this.applicationService.remove(this.req.params.id);
  }
}

export default ApplicationController;
