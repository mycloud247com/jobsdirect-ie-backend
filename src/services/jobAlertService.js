class JobAlertService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async list(user_id) {
    return this.db.JobAlert.findAll({
      where: { user_id },
      order: [["created_at", "DESC"]],
    });
  }

  async create(user_id, data) {
    if (!data.keyword && !data.location && !data.category && !data.job_type) {
      throw this.errorManager.getError("BAD_REQUEST", "At least one filter (keyword, location, category, or job type) is required.");
    }
    return this.db.JobAlert.create({
      user_id,
      keyword: data.keyword || null,
      location: data.location || null,
      category: data.category || null,
      job_type: data.job_type || data.jobType || null,
      frequency: data.frequency || "daily",
    });
  }

  async update(id, user_id, updates) {
    const alert = await this.db.JobAlert.findOne({ where: { id, user_id } });
    if (!alert) throw this.errorManager.getError("NOT_FOUND", "Job alert not found");
    await alert.update(updates);
    return alert;
  }

  async toggle(id, user_id) {
    const alert = await this.db.JobAlert.findOne({ where: { id, user_id } });
    if (!alert) throw this.errorManager.getError("NOT_FOUND", "Job alert not found");
    await alert.update({ is_active: !alert.is_active });
    return alert;
  }

  async remove(id, user_id) {
    const alert = await this.db.JobAlert.findOne({ where: { id, user_id } });
    if (!alert) throw this.errorManager.getError("NOT_FOUND", "Job alert not found");
    await alert.destroy();
    return { success: true };
  }

  /**
   * Match new jobs against active alerts and send notifications.
   * Called by cron — processes alerts that haven't been sent within their frequency window.
   */
  async processAlerts() {
    const { Op } = this.db.Sequelize;
    const now = new Date();

    const alerts = await this.db.JobAlert.findAll({
      where: { is_active: true },
      include: [{ model: this.db.User, as: "user", attributes: ["id", "email", "first_name"] }],
    });

    for (const alert of alerts) {
      /* Frequency check disabled for testing
      if (alert.lastSentAt) {
        const hoursSinceSent = (now - new Date(alert.lastSentAt)) / (1000 * 60 * 60);
        if (alert.frequency === "daily" && hoursSinceSent < 24) continue;
        if (alert.frequency === "weekly" && hoursSinceSent < 168) continue;
      }
      */

      // Build match query — only approved, non-expired jobs created since last send
      const where = {
        status: "approved",
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
      };
      if (alert.last_sent_at) {
        where.created_at = { [Op.gt]: alert.last_sent_at };
      } else {
        // First time: only jobs from last 24 hours
        where.created_at = { [Op.gt]: new Date(now - 24 * 60 * 60 * 1000) };
      }

      if (alert.keyword) {
        const kw = `%${alert.keyword}%`;
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { title: { [Op.iLike]: kw } },
            { description: { [Op.iLike]: kw } },
            { company_name: { [Op.iLike]: kw } },
            { category: { [Op.iLike]: kw } },
            { city_town: { [Op.iLike]: kw } },
          ],
        });
      }
      if (alert.location) {
        where.location = { [Op.iLike]: `%${alert.location}%` };
      }
      if (alert.category) {
        where.category = { [Op.iLike]: `%${alert.category}%` };
      }
      if (alert.job_type) {
        where.job_type = { [Op.iLike]: `%${alert.job_type}%` };
      }

      const matchingJobs = await this.db.Job.findAll({
        where,
        limit: 10,
        order: [["created_at", "DESC"]],
        attributes: ["id", "title", "company_name", "location", "job_type"],
      });

      if (matchingJobs.length === 0) continue;

      // Send notifications
      try {
        const { notify } = await import("./notifier.js");
        const alertSummary = [alert.keyword, alert.location, alert.category, alert.jobType].filter(Boolean).join(", ");
        
        // 1. Email notification
        notify("JOB_ALERT_MATCH", {
          user: alert.user,
          jobs: matchingJobs.map((j) => j.toJSON()),
          alertSummary,
        });

        // 2. In-app notification with redirect link
        const params = new URLSearchParams();
        if (alert.keyword) params.set("keyword", alert.keyword);
        if (alert.location) params.set("location", alert.location);
        if (alert.category) params.set("category", alert.category);
        if (alert.job_type) params.set("type", alert.job_type);

        await this.db.Notification.create({
          user_id: alert.user_id,
          type: "application", // Reusing 'application' icon which is a briefcase
          title: "New Matching Jobs",
          message: `${matchingJobs.length} new job${matchingJobs.length === 1 ? "" : "s"} match your alert: ${alertSummary}`,
          link: `/jobs?${params.toString()}`,
        });
      } catch (err) {
        console.error("Failed to send job alert notification:", err);
      }

      // Update last_sent_at
      await alert.update({ last_sent_at: now });
    }
  }
}

export default JobAlertService;
