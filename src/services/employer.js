import s3Service from "./s3Service.js";

async function flattenEmployer(employer) {
  if (!employer) return null;
  const json = employer.toJSON ? employer.toJSON() : employer;
  if (json.user) json.user_email = json.user.email;

  // Refresh verification URL if key exists
  if (json.verification_doc_key) {
    try {
      json.verification_doc_url = await s3Service.getSignedDownloadUrl(json.verification_doc_key);
    } catch (err) {
      console.error(`[EmployerService] Failed to refresh signed URL for ${json.id}:`, err.message);
    }
  }

  return json;
}

class EmployerService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async list(query = {}) {
    const { Op } = this.db.Sequelize;
    let where = {};
    
    // Resolve user_email or user_id to a set of employer IDs
    let target_user_id = query.user_id;
    if (query.user_email) {
      const user = await this.db.User.findOne({ where: { email: query.user_email.toLowerCase() } });
      if (user) target_user_id = user.id;
      else return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    if (target_user_id) {
      // Find all employers where user is a team member
      const memberships = await this.db.EmployerTeamMember.findAll({
        where: { user_id: target_user_id, status: "active" },
        attributes: ["employer_id"],
      });
      const employer_ids = memberships.map((m) => m.employer_id);
      
      // Fallback: direct owner link
      const direct_employer = await this.db.Employer.findOne({ where: { user_id: target_user_id }, attributes: ["id"] });
      if (direct_employer) employer_ids.push(direct_employer.id);

      if (employer_ids.length > 0) {
        where.id = { [Op.in]: employer_ids };
      } else {
        return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      }
    }

    if (query.verification_status) where.verification_status = query.verification_status;

    const order = [["created_at", "DESC"]];
    const include = [{ model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] }];

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const { count, rows } = await this.db.Employer.findAndCountAll({ where, order, include, limit: pageSize, offset, distinct: true });
    
    const items = await Promise.all(rows.map((r) => flattenEmployer(r)));
    
    return { items, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
  }

  async getById(id) {
    const employer = await this.db.Employer.findByPk(id, {
      include: [{ model: this.db.User, as: "user", attributes: { exclude: ["password"] } }],
    });
    if (!employer) throw this.errorManager.getError("EMPLOYER_NOT_FOUND");
    return flattenEmployer(employer);
  }

  async getByUserId(user_id) {
    const employer = await this.db.Employer.findOne({
      where: { user_id },
      include: [{ model: this.db.User, as: "user", attributes: { exclude: ["password"] } }],
    });
    if (!employer) return null;
    return await flattenEmployer(employer);
  }

  async getPublicProfile(slug) {
    // slug = company-name in lowercase with hyphens
    const { Op } = this.db.Sequelize;
    const employers = await this.db.Employer.findAll({
      where: { verification_status: "approved" },
      include: [{ model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] }],
    });

    // Find by slug match (company name → slug)
    const employer = employers.find((e) => {
      const companySlug = (e.company_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return companySlug === slug;
    });

    if (!employer) throw this.errorManager.getError("NOT_FOUND", "Employer profile not found");

    // Get active jobs
    const jobs = await this.db.Job.findAll({
      where: {
        employer_id: employer.id,
        status: "approved",
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
      order: [["created_at", "DESC"]],
      limit: 20,
      include: [{ model: this.db.JobAddon, as: "addons" }],
    });

    const flat = await flattenEmployer(employer);
    return {
      ...flat,
      active_jobs: jobs.map((j) => j.toJSON ? j.toJSON() : j),
    };
  }

  async create(data, user) {
    data.user_id = user.id;
    if (!data.company_name) data.company_name = "";

    // Clean up empty/invalid date strings
    const dateFields = ["date_of_birth", "approval_submitted_at", "approved_at", "last_free_job_at"];
    for (const field of dateFields) {
      if (data[field] === "" || data[field] === "Invalid date") {
        data[field] = null;
      }
    }

    const employer = await this.db.Employer.create(data);

    // Auto-add owner to team
    try {
      const TeamService = (await import("./teamService.js")).default;
      const teamService = new TeamService({ db: this.db, errorManager: this.errorManager });
      await teamService.addOwner(employer.id, user.id, user.email);
    } catch {}

    return this.getById(employer.id);
  }

  async update(id, updates) {
    const employer = await this.db.Employer.findByPk(id);
    if (!employer) throw this.errorManager.getError("EMPLOYER_NOT_FOUND");

    // Clean up empty/invalid date strings to avoid Postgres errors
    const dateFields = ["date_of_birth", "approval_submitted_at", "approved_at", "last_free_job_at"];
    for (const field of dateFields) {
      if (updates[field] === "" || updates[field] === "Invalid date") {
        updates[field] = null;
      }
    }

    const oldVerification = employer.verification_status;
    await employer.update(updates);

    // Notify employer on verification status change
    if (updates.verification_status && updates.verification_status !== oldVerification) {
      const user = await this.db.User.findByPk(employer.user_id);
      if (user) {
        // Email notification
        const { notify } = await import("./notifier.js");
        if (updates.verification_status === "approved") {
          notify("EMPLOYER_APPROVED", { employer: { email: user.email, first_name: user.first_name } });
        } else if (updates.verification_status === "rejected") {
          notify("EMPLOYER_REJECTED", { employer: { email: user.email, first_name: user.first_name }, reason: updates.admin_review_note || "" });
        }

        // In-app notification
        const statusMessages = {
          approved: "Your company has been verified and approved. You can now post jobs.",
          rejected: `Your company verification was rejected.${updates.admin_review_note ? ` Reason: ${updates.admin_review_note}` : ""}`,
        };
        const message = statusMessages[updates.verification_status];
        if (message) {
          const { default: NotificationService } = await import("./notificationService.js");
          const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });
          await notificationService.create({
            user_id: user.id,
            title: updates.verification_status === "approved" ? "Company Approved" : "Company Rejected",
            message,
            type: "employer",
            link: "/dashboard",
          });
        }
      }
    }

    return this.getById(id);
  }

  async remove(id) {
    const employer = await this.db.Employer.findByPk(id);
    if (!employer) throw this.errorManager.getError("EMPLOYER_NOT_FOUND");
    await employer.destroy();
    return { success: true };
  }
}

export default EmployerService;
