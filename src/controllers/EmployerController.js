import EmployerService from "../services/employer.js";

class EmployerController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.employerService = new EmployerService(context);
  }

  async list() {
    return this.employerService.list(this.req.query);
  }

  async getById() {
    return this.employerService.getById(this.req.params.id);
  }

  async getPublicProfile() {
    return this.employerService.getPublicProfile(this.req.params.slug);
  }

  async getByUser() {
    return this.employerService.getByUserId(this.req.user.id);
  }

  async create() {
    return this.employerService.create(this.req.body, this.req.user);
  }

  async update() {
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.context.db, this.req.user.id, this.req.params.id, ["owner", "admin"], this.context.errorManager);
    return this.employerService.update(this.req.params.id, this.req.body);
  }

  async remove() {
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.context.db, this.req.user.id, this.req.params.id, ["owner"], this.context.errorManager);
    return this.employerService.remove(this.req.params.id);
  }

  async uploadVerificationDoc() {
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.context.db, this.req.user.id, this.req.params.id, ["owner", "admin"], this.context.errorManager);

    const file = this.req.file;
    if (!file) throw this.context.errorManager.getError("BAD_REQUEST", "No file uploaded");

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Only PDF, JPG, PNG, or WebP files are allowed");
    }

    const { default: s3Service } = await import("../services/s3Service.js");
    const { key } = await s3Service.uploadFile(file.buffer, "verification-docs", file.originalname, file.mimetype);
    const url = await s3Service.getSignedDownloadUrl(key);

    const employer = await this.context.db.Employer.findByPk(this.req.params.id);
    if (!employer) throw this.context.errorManager.getError("NOT_FOUND", "Employer not found");

    // Delete old doc if exists
    if (employer.verification_doc_key) {
      try { await s3Service.deleteFile(employer.verification_doc_key); } catch {}
    }

    const updates = { verification_doc_key: key, verification_doc_url: url };
    await employer.update(updates);
    return { verification_doc_url: url };
  }

  async submitForVerification() {
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.context.db, this.req.user.id, this.req.params.id, ["owner", "admin"], this.context.errorManager);

    const employer = await this.context.db.Employer.findByPk(this.req.params.id);
    if (!employer) throw this.context.errorManager.getError("NOT_FOUND", "Employer not found");

    if (!employer.verification_doc_url) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Please upload a verification document first");
    }

    if (employer.verification_status === "approved") {
      throw this.context.errorManager.getError("BAD_REQUEST", "Profile is already approved");
    }

    await employer.update({
      verification_status: "under_review",
      approval_submitted_at: new Date()
    });

    // Notify admin
    try {
      const { notify } = await import("../services/notifier.js");
      notify("ADMIN_EMPLOYER_VERIFICATION_SUBMITTED", { employer: { company_name: employer.company_name, id: employer.id } });
    } catch (err) {
      console.error("[EmployerController] Failed to notify admin:", err);
    }

    return this.employerService.getById(employer.id);
  }

  // ─── CRO Company Search ───

  async searchCRO() {
    const { q } = this.req.query;
    if (!q || q.length < 2) return [];
    const CROService = (await import("../services/croService.js")).default;
    const cro = new CROService();
    return cro.searchCompanies(q, 10);
  }

  async getCROCompany() {
    const { num } = this.req.params;
    const CROService = (await import("../services/croService.js")).default;
    const cro = new CROService();
    const company = await cro.getCompany(num);
    if (!company) throw this.context.errorManager.getError("NOT_FOUND", "Company not found in CRO registry");
    return company;
  }

  // ─── Document Requests ───

  async listDocumentRequests() {
    const requests = await this.context.db.DocumentRequest.findAll({
      where: { employer_id: this.req.params.id },
      order: [["created_at", "DESC"]],
      include: [{ model: this.context.db.User, as: "requestedBy", attributes: ["first_name", "last_name"] }],
    });
    // Generate signed URLs for uploaded files
    const s3 = (await import("../services/s3Service.js")).default;
    for (const req of requests) {
      if (req.file_key) {
        try { req.file_url = await s3.getSignedDownloadUrl(req.file_key); } catch {}
      }
    }
    return requests;
  }

  async createDocumentRequest() {
    const { documents } = this.req.body;
    if (!Array.isArray(documents) || !documents.length) {
      throw this.context.errorManager.getError("BAD_REQUEST", "At least one document request is required");
    }

    const employer = await this.context.db.Employer.findByPk(this.req.params.id);
    if (!employer) throw this.context.errorManager.getError("NOT_FOUND", "Employer not found");

    const created = [];
    for (const doc of documents) {
      if (!doc.title) continue;
      const request = await this.context.db.DocumentRequest.create({
        employer_id: employer.id,
        requested_by: this.req.user.id,
        title: doc.title,
        description: doc.description || null,
      });
      created.push(request);
    }

    // Notify employer
    const empUser = await this.context.db.User.findOne({ where: { id: employer.user_id } });
    if (empUser) {
      const titles = created.map(d => d.title).join(", ");
      await this.context.db.Notification.create({
        user_id: empUser.id,
        type: "employer",
        title: "Documents Requested",
        message: `Admin has requested the following documents: ${titles}. Please upload them in your profile.`,
        link: "/dashboard/profile",
      });
      try {
        const { notify } = await import("../services/notifier.js");
        notify("DOCUMENTS_REQUESTED", {
          employer: { email: empUser.email, first_name: empUser.first_name },
          documents: created.map(d => ({ title: d.title, description: d.description })),
        });
      } catch {}
    }

    return created;
  }

  async uploadDocument() {
    const { id, requestId } = this.req.params;
    const request = await this.context.db.DocumentRequest.findOne({
      where: { id: requestId, employer_id: id },
    });
    if (!request) throw this.context.errorManager.getError("NOT_FOUND", "Document request not found");
    if (request.status === "approved") throw this.context.errorManager.getError("BAD_REQUEST", "This document has already been approved");

    const file = this.req.file;
    if (!file) throw this.context.errorManager.getError("BAD_REQUEST", "No file uploaded");

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Only PDF, JPG, PNG, and WebP files are accepted");
    }

    const s3 = (await import("../services/s3Service.js")).default;
    const filename = `${requestId}-${Date.now()}.${file.originalname?.split(".").pop() || "pdf"}`;
    const { key } = await s3.uploadFile(file.buffer, `documents/${id}`, filename, file.mimetype);

    await request.update({ file_key: key, status: "uploaded", uploaded_at: new Date() });

    // Notify admins
    const admins = await this.context.db.User.findAll({ where: { role: "admin" } });
    const employer = await this.context.db.Employer.findByPk(id);
    for (const admin of admins) {
      await this.context.db.Notification.create({
        user_id: admin.id,
        type: "employer",
        title: "Document Uploaded",
        message: `${employer?.company_name || "An employer"} uploaded "${request.title}". Please review.`,
        link: `/admin/companies`,
      });
    }

    return request;
  }

  async reviewDocument() {
    const { id, requestId } = this.req.params;
    const { status, admin_note } = this.req.body;
    if (!["approved", "rejected"].includes(status)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Status must be approved or rejected");
    }

    const request = await this.context.db.DocumentRequest.findOne({
      where: { id: requestId, employer_id: id },
    });
    if (!request) throw this.context.errorManager.getError("NOT_FOUND", "Document request not found");

    await request.update({ status, admin_note: admin_note || null, reviewed_at: new Date() });

    // Notify employer
    const employer = await this.context.db.Employer.findByPk(id);
    if (employer) {
      const empUser = await this.context.db.User.findOne({ where: { id: employer.user_id } });
      if (empUser) {
        await this.context.db.Notification.create({
          user_id: empUser.id,
          type: "employer",
          title: status === "approved" ? "Document Approved" : "Document Rejected",
          message: `Your document "${request.title}" has been ${status}.${admin_note ? ` Note: ${admin_note}` : ""}`,
          link: "/dashboard/profile",
        });
      }
    }

    return request;
  }
}

export default EmployerController;
