import JobService from "../services/job.js";
import ProductService from "../services/productService.js";

class JobController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.jobService = new JobService(context);
    this.productService = new ProductService(context);
  }

  async list() {
    return this.jobService.list(this.req.query);
  }

  async getById() {
    const { id } = this.req.params;
    return this.jobService.getById(id, this.req.user || null, this.req.ip);
  }

  async create() {
    return this.jobService.create(this.req.body, this.req.user);
  }

  async checkout() {
    const { id } = this.req.params;
    return this.jobService.checkout(id, this.req.user);
  }

  async update() {
    const { id } = this.req.params;
    return this.jobService.update(id, this.req.body, this.req.user);
  }

  async remove() {
    const { id } = this.req.params;
    return this.jobService.remove(id);
  }

  async activateAddon() {
    const { id } = this.req.params;
    const { addonId } = this.req.body;
    if (!addonId) throw this.context.errorManager.getError("BAD_REQUEST", "addonId is required");
    return this.jobService.activateAddon(id, addonId, this.req.user);
  }

  async renew() {
    const { id } = this.req.params;
    return this.jobService.renew(id, this.req.user);
  }

  async duplicate() {
    const { id } = this.req.params;
    return this.jobService.duplicate(id, this.req.user);
  }

  async costEstimate() {
    const { addonIds } = this.req.body;
    return this.productService.calculateJobCost(addonIds || []);
  }

  async scanContent() {
    const { title, description, job_id } = this.req.body;
    if (!title && !description) throw this.context.errorManager.getError("BAD_REQUEST", "Title or description required");
    const ContentModerationService = (await import("../services/contentModeration.js")).default;
    const moderationService = new ContentModerationService();
    const result = await moderationService.scan(title || "", description || "");

    // Critical severity = instant flag + admin notification
    if (result.severity === "critical" && job_id) {
      const job = await this.context.db.Job.findByPk(job_id);
      if (job) {
        await job.update({ status: "flagged", moderation_result: result });
        // Notify admin
        try {
          const admins = await this.context.db.User.findAll({ where: { role: "admin" } });
          for (const admin of admins) {
            await this.context.db.Notification.create({
              user_id: admin.id, type: "job", title: "CRITICAL: Job Flagged",
              message: `Job "${job.title}" (${job.id}) flagged for critical compliance violations. Immediate review required.`,
              link: `/admin/jobs`,
            });
          }
        } catch {}
      }
    }

    return result;
  }

  async trackClick() {
    const { id } = this.req.params;
    return this.jobService.trackExternalClick(id);
  }

  async resubmit() {
    const { id } = this.req.params;
    return this.jobService.resubmit(id, this.req.body, this.req.user);
  }

  async getReport() {
    const { id } = this.req.params;
    return this.jobService.getReportData(id, this.req.user);
  }

  async scrapeJobsIreland() {
    const ref = String(this.req.body?.ref || "").trim();
    if (!/^\d{6,10}$/.test(ref)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "A valid numeric JobsIreland reference ID is required");
    }
    return this.jobService.scrapeJobsIreland(ref);
  }
}

export default JobController;
