import { getEmployerForUser } from "../utils/employerLookup.js";

class ApplicationService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async list(query = {}) {
    const where = {};
    if (query.job_id) where.job_id = query.job_id;
    if (query.user_id) where.user_id = query.user_id;
    if (query.employer_id) where.employer_id = query.employer_id;
    if (query.status) where.status = query.status;

    // Resolve email-based filters
    if (query.employee_email) {
      const { Op } = this.db.Sequelize || require("sequelize");
      const user = await this.db.User.findOne({ where: { email: query.employee_email.toLowerCase() } });
      if (user) {
        where[Op.or] = [
          { user_id: user.id },
          { guest_email: query.employee_email.toLowerCase() },
        ];
      } else {
        where.guest_email = query.employee_email.toLowerCase();
      }
    }
    if (query.employer_email) {
      const user = await this.db.User.findOne({ where: { email: query.employer_email } });
      if (user) {
        const employer = await getEmployerForUser(this.db, user.id);
        if (employer) where.employer_id = employer.id;
        else return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      } else return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    const order = [["created_at", "DESC"]];
    const include = [
      { model: this.db.Job, as: "job", attributes: ["id", "title", "company_name", "location"] },
      { model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] },
    ];

    const transformApp = (app) => {
      if (!app) return null;
      const json = typeof app.toJSON === "function" ? app.toJSON() : app;
      json.employee_email = json.user?.email || json.guest_email;
      json.employee_name = json.user ? `${json.user.first_name} ${json.user.last_name}` : json.guest_name || "Guest Candidate";
      json.job_title = json.job?.title;
      json.company_name = json.job?.company_name;
      json.cv_url = json.cv_url; 
      return json;
    };

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const { count, rows } = await this.db.Application.findAndCountAll({ where, order, include, limit: pageSize, offset, distinct: true });
    return { items: rows.map(transformApp), total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
  }

  async guestApply(data, file) {
    if (!data.job_id) throw this.errorManager.getError("BAD_REQUEST", "Job ID required");
    if (!data.name) throw this.errorManager.getError("BAD_REQUEST", "Name required");
    if (!data.email) throw this.errorManager.getError("BAD_REQUEST", "Email required");
    if (!data.phone) throw this.errorManager.getError("BAD_REQUEST", "Phone required");

    const jobId = data.job_id;

    // Check if already applied with this email
    const existing = await this.db.Application.findOne({
      where: { job_id: jobId, guest_email: data.email.toLowerCase() },
    });
    if (existing) throw this.errorManager.getError("BAD_REQUEST", "You have already applied for this job.");

    const job = await this.db.Job.findByPk(jobId);

    const application = await this.db.Application.create({
      job_id: jobId,
      employer_id: job?.employer_id,
      status: "submitted",
      cover_letter: data.cover_letter || data.message || "",
      guest_name: data.name,
      guest_email: data.email.toLowerCase(),
      guest_phone: data.phone,
      guest_county: data.county || "",
      guest_country: data.country || "Ireland",
      is_guest: true,
    });

    if (file) {
      const { default: s3Service } = await import("./s3Service.js");
      const { key } = await s3Service.uploadFile(file.buffer, "cvs", file.originalname, file.mimetype);
      await this.db.ApplicationDocument.create({
        application_id: application.id,
        name: "CV",
        type: "cv",
        file_name: file.originalname,
        file_path: key,
        mime_type: file.mimetype,
        file_size: file.size,
      });
    }

    // Notify employer
    if (job?.created_by) {
      const { notify } = await import("./notifier.js");
      const empUser = await this.db.User.findOne({ where: { email: job.created_by } });
      if (empUser) {
        notify("NEW_APPLICATION", {
          employer: { email: empUser.email, first_name: empUser.first_name },
          job: { title: job.title },
          applicantName: data.name,
        });
      }
    }

    // Notify guest candidate
    const { notify } = await import("./notifier.js");
    notify("APPLICATION_SUBMITTED", {
      candidate: { email: data.email, name: data.name },
      job: { title: job?.title, company_name: job?.company_name },
    });

    return application;
  }

  async create(data, user) {
    const createData = {
      ...data,
      user_id: user.id,
      job_id: data.job_id,
      cover_letter: data.cover_letter || data.message || "",
    };

    // Resolve employer_id from Job
    const job = await this.db.Job.findByPk(createData.job_id);
    if (job) createData.employer_id = job.employer_id;

    const application = await this.db.Application.create(createData);

    // Snapshot CV — use provided cv_id, or auto-attach default CV
    let cv = null;
    if (data.cv_id) {
      cv = await this.db.CV.findByPk(data.cv_id);
    } else {
      // Auto-attach default CV for this user
      cv = await this.db.CV.findOne({
        where: { user_id: user.id, is_default: true },
        order: [["created_at", "DESC"]],
      }) || await this.db.CV.findOne({
        where: { user_id: user.id },
        order: [["created_at", "DESC"]],
      });
    }

    if (cv) {
      await this.db.ApplicationDocument.create({
        application_id: application.id,
        name: cv.name || "CV",
        type: "cv",
        file_name: cv.file_name,
        file_path: cv.file_key || cv.file_path,
        mime_type: cv.mime_type,
        file_size: cv.file_size,
      });
    } else if (data.cv_url) {
      await this.db.ApplicationDocument.create({
        application_id: application.id,
        name: "CV",
        type: "cv",
        file_url: data.cv_url,
      });
    }

    // Return enriched
    const full = await this.db.Application.findByPk(application.id, {
      include: [
        { model: this.db.Job, as: "job", attributes: ["id", "title", "company_name", "location", "created_by"] },
        { model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] },
        { model: this.db.ApplicationDocument, as: "documents" },
      ],
    });

    const json = full.toJSON();
    json.employee_email = json.user?.email || json.guest_email;
    json.employee_name = json.user ? `${json.user.first_name} ${json.user.last_name}` : json.guest_name || "Guest Candidate";
    json.job_title = json.job?.title;
    json.company_name = json.job?.company_name;

    // Notify employer of new application
    if (json.job?.created_by) {
      const { notify } = await import("./notifier.js");
      const empUser = await this.db.User.findOne({ where: { email: json.job.created_by } });
      if (empUser) {
        notify("NEW_APPLICATION", {
          employer: { email: empUser.email, first_name: empUser.first_name },
          job: { title: json.job.title },
          applicantName: json.employee_name || data.employee_name || "A candidate",
        });
      }
    }

    // Notify candidate
    if (json.user?.email) {
      const { notify } = await import("./notifier.js");
      notify("APPLICATION_SUBMITTED", {
        candidate: { email: json.user.email, name: json.employee_name },
        job: { title: json.job?.title, company_name: json.job?.company_name },
      });
    }

    return json;
  }

  async update(id, updates) {
    const application = await this.db.Application.findByPk(id, {
      include: [{ model: this.db.Job, as: "job" }]
    });
    if (!application) throw this.errorManager.getError("APPLICATION_NOT_FOUND");
    
    const oldStatus = application.status;
    await application.update(updates);

    // If status changed and it's not a guest, notify the candidate
    if (updates.status && updates.status !== oldStatus && application.user_id) {
      const { default: NotificationService } = await import("./notificationService.js");
      const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });

      const statusLabels = {
        viewed: "viewed your application",
        shortlisted: "shortlisted you",
        interview: "invited you for an interview",
        rejected: "updated your application status",
        hired: "hired you!",
      };

      const label = statusLabels[updates.status] || `updated your status to ${updates.status}`;

      await notificationService.create({
        user_id: application.user_id,
        title: "Application Update",
        message: `${application.job?.company_name || "An employer"} has ${label} for the "${application.job?.title}" position.`,
        type: "application",
        link: `/dashboard/applications/${id}`,
      });

      // Email notifications for status changes (§14)
      const candidateUser = await this.db.User.findByPk(application.user_id);
      if (candidateUser) {
        const { notify } = await import("./notifier.js");
        const emailData = {
          candidate: { email: candidateUser.email, name: candidateUser.first_name || "Candidate" },
          job: { title: application.job?.title || "a position" },
          status: updates.status,
        };
        if (updates.status === "viewed" || updates.status === "shortlisted") {
          notify("APPLICATION_STATUS_CHANGED", emailData);
        }
      }
    }

    return application;
  }

  async getById(id) {
    const application = await this.db.Application.findByPk(id, {
      include: [
        { model: this.db.Job, as: "job", attributes: ["id", "title", "company_name", "location", "description"] },
        { model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] },
        { model: this.db.ApplicationDocument, as: "documents" },
      ],
    });
    if (!application) throw this.errorManager.getError("APPLICATION_NOT_FOUND");
    
    const json = application.toJSON();
    json.employee_email = json.user?.email || json.guest_email;
    json.employee_name = json.user ? `${json.user.first_name} ${json.user.last_name}` : json.guest_name || "Guest Candidate";
    json.job_title = json.job?.title;
    json.company_name = json.job?.company_name;

    // Auto-attach CV if application has no documents (backfill for old applications)
    if ((!json.documents || json.documents.length === 0) && json.user_id && !json.is_guest) {
      const cv = await this.db.CV.findOne({
        where: { user_id: json.user_id, is_default: true },
        order: [["created_at", "DESC"]],
      }) || await this.db.CV.findOne({
        where: { user_id: json.user_id },
        order: [["created_at", "DESC"]],
      });

      if (cv) {
        const doc = await this.db.ApplicationDocument.create({
          application_id: json.id,
          name: cv.name || "CV",
          type: "cv",
          file_name: cv.file_name,
          file_path: cv.file_key || cv.file_path,
          mime_type: cv.mime_type,
          file_size: cv.file_size,
        });
        json.documents = [doc.toJSON ? doc.toJSON() : doc];
      }
    }

    // Generate signed URLs for documents
    const { default: s3Service } = await import("./s3Service.js");
    if (json.documents && json.documents.length > 0) {
      for (const doc of json.documents) {
        if (doc.file_path) {
          doc.file_url = await s3Service.getSignedDownloadUrl(doc.file_path);
        }
      }
    }

    // Generate signed URL for CV if stored as S3 key
    if (json.cv_file_key) {
      try {
        json.cv_url = await s3Service.getSignedDownloadUrl(json.cv_file_key);
      } catch {}
    }

    return json;
  }

  async askForInfo(id, message) {
    const application = await this.db.Application.findByPk(id, {
      include: [{ model: this.db.Job, as: "job" }]
    });
    if (!application) throw this.errorManager.getError("APPLICATION_NOT_FOUND");

    await application.update({
      status: "contacted",
      employer_request_message: message,
    });

    // Notify candidate
    if (application.user_id) {
      const { default: NotificationService } = await import("./notificationService.js");
      const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });
      await notificationService.create({
        user_id: application.user_id,
        title: "Information Requested",
        message: `${application.job?.company_name || "An employer"} has requested more information for your "${application.job?.title}" application.`,
        type: "application",
        link: `/dashboard/applications/${id}`,
      });
    }

    // Email notification
    const recipientEmail = application.user_id
      ? (await this.db.User.findByPk(application.user_id))?.email
      : application.guest_email;
    if (recipientEmail) {
      const { notify } = await import("./notifier.js");
      notify("ASK_FOR_INFO", {
        candidate: { email: recipientEmail, name: application.guest_name || "Candidate" },
        job: { title: application.job?.title },
        employer: { company_name: application.job?.company_name },
        message,
      });
    }

    return application;
  }

  async inviteToInterview(id, data) {
    const application = await this.db.Application.findByPk(id, {
      include: [{ model: this.db.Job, as: "job" }]
    });
    if (!application) throw this.errorManager.getError("APPLICATION_NOT_FOUND");

    await application.update({
      status: "interview",
      interview_date: data.interview_date,
      interview_time: data.interview_time,
      interview_type: data.interview_type,
      interview_location: data.interview_location || null,
      interview_meeting_link: data.interview_meeting_link || null,
      interview_notes: data.interview_notes || null,
    });

    // Notify candidate
    if (application.user_id) {
      const { default: NotificationService } = await import("./notificationService.js");
      const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });
      const typeLabel = data.interview_type === "virtual" ? "virtual" : "in-person";
      await notificationService.create({
        user_id: application.user_id,
        title: "Interview Invitation",
        message: `${application.job?.company_name || "An employer"} has invited you for a ${typeLabel} interview for "${application.job?.title}" on ${data.interview_date} at ${data.interview_time}.`,
        type: "application",
        link: `/dashboard/applications/${id}`,
      });
    }

    // Email notification
    const recipientEmail = application.user_id
      ? (await this.db.User.findByPk(application.user_id))?.email
      : application.guest_email;
    if (recipientEmail) {
      const candidateUser = application.user_id ? await this.db.User.findByPk(application.user_id) : null;
      const { notify } = await import("./notifier.js");
      notify("INTERVIEW_INVITE", {
        candidate: { email: recipientEmail, name: candidateUser?.first_name || application.guest_name || "Candidate" },
        job: { title: application.job?.title },
        employer: { company_name: application.job?.company_name },
        interview: {
          date: data.interview_date,
          time: data.interview_time,
          type: data.interview_type,
          location: data.interview_location,
          meeting_link: data.interview_meeting_link,
          notes: data.interview_notes,
        },
      });
    }

    return application;
  }

  async remove(id) {
    const application = await this.db.Application.findByPk(id);
    if (!application) throw this.errorManager.getError("APPLICATION_NOT_FOUND");
    await application.destroy();
    return { success: true };
  }
}

export default ApplicationService;
