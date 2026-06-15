import s3Service from "../services/s3Service.js";

const CV_PLAN_LIMITS = {
  free: { maxCVs: 1, templates: ["basic"], watermark: true },
  professional: { maxCVs: 1, templates: ["basic", "modern", "executive"], watermark: false },
  premium: { maxCVs: 4, templates: ["basic", "modern", "executive", "creative"], watermark: false },
};

class CVController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.db = context.db;
  }

  async _getEmployeeAndPlan() {
    const employee = await this.db.Employee.findOne({ where: { user_id: this.req.user.id } });
    const plan = employee?.cv_plan || "free";
    const limits = CV_PLAN_LIMITS[plan] || CV_PLAN_LIMITS.free;
    return { employee, plan, limits };
  }

  async list() {
    const cvs = await this.db.CV.findAll({
      where: { user_id: this.req.user.id },
      order: [["created_at", "DESC"]],
    });
    const { plan, limits } = await this._getEmployeeAndPlan();
    return { cvs, plan, limits };
  }

  async upload() {
    const file = this.req.file;
    if (!file) throw this.context.errorManager.getError("BAD_REQUEST", "No file uploaded");

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Only PDF, DOC, and DOCX files are allowed");
    }

    const { limits } = await this._getEmployeeAndPlan();
    const existingCount = await this.db.CV.count({ where: { user_id: this.req.user.id } });
    if (existingCount >= limits.maxCVs) {
      throw this.context.errorManager.getError("BAD_REQUEST", `Your plan allows up to ${limits.maxCVs} CV${limits.maxCVs > 1 ? "s" : ""}. Delete an existing CV or upgrade your plan.`);
    }

    const { key } = await s3Service.uploadFile(file.buffer, "cvs", file.originalname, file.mimetype);

    const cv = await this.db.CV.create({
      user_id: this.req.user.id,
      name: this.req.body.name || file.originalname.replace(/\.[^/.]+$/, ""),
      type: "uploaded",
      file_name: file.originalname,
      file_key: key,
      mime_type: file.mimetype,
      file_size: file.size,
    });

    return cv;
  }

  async remove() {
    const cv = await this.db.CV.findOne({
      where: { id: this.req.params.id, user_id: this.req.user.id },
    });
    if (!cv) throw this.context.errorManager.getError("NOT_FOUND", "CV not found");

    if (cv.file_key) {
      try { await s3Service.deleteFile(cv.file_key); } catch {}
    }

    await cv.destroy();
    return { success: true };
  }

  async setDefault() {
    await this.db.CV.update({ is_default: false }, { where: { user_id: this.req.user.id } });
    const cv = await this.db.CV.findOne({
      where: { id: this.req.params.id, user_id: this.req.user.id },
    });
    if (!cv) throw this.context.errorManager.getError("NOT_FOUND", "CV not found");
    await cv.update({ is_default: true });
    return cv;
  }

  async updateContent() {
    const cv = await this.db.CV.findOne({
      where: { id: this.req.params.id, user_id: this.req.user.id },
    });
    if (!cv) throw this.context.errorManager.getError("NOT_FOUND", "CV not found");

    const { title, bio, skills, workExperience, education, certifications, projects, name, templateId } = this.req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (bio !== undefined) updates.bio = bio;
    if (skills !== undefined) updates.skills = skills;
    if (workExperience !== undefined) updates.work_experience = workExperience;
    if (education !== undefined) updates.education = education;
    if (certifications !== undefined) updates.certifications = certifications;
    if (projects !== undefined) updates.projects = projects;
    if (name !== undefined) updates.name = name;

    if (templateId !== undefined) {
      const { limits } = await this._getEmployeeAndPlan();
      if (!limits.templates.includes(templateId)) {
        throw this.context.errorManager.getError("FORBIDDEN", "This template requires a higher CV plan.");
      }
      updates.template_id = templateId;
    }

    await cv.update(updates);
    return cv;
  }

  async generate() {
    const { limits } = await this._getEmployeeAndPlan();

    const existingCount = await this.db.CV.count({ where: { user_id: this.req.user.id } });
    const existingGenerated = await this.db.CV.findOne({
      where: { user_id: this.req.user.id, type: { [this.db.Sequelize.Op.like]: "generated_%" } },
    });
    if (!existingGenerated && existingCount >= limits.maxCVs) {
      throw this.context.errorManager.getError("BAD_REQUEST", `Your plan allows up to ${limits.maxCVs} CV${limits.maxCVs > 1 ? "s" : ""}. Delete an existing CV or upgrade your plan.`);
    }

    const template_id = this.req.body?.templateId || "basic";
    if (!limits.templates.includes(template_id)) {
      throw this.context.errorManager.getError("FORBIDDEN", "This template requires a higher CV plan.");
    }

    const CVGenerator = (await import("../services/cvGenerator.js")).default;
    const generator = new CVGenerator(this.context);
    const cvId = this.req.body?.cvId;
    const { html, cv } = await generator.generateCV(this.req.user.id, {
      cv_id: cvId,
      template_id,
      show_watermark: limits.watermark,
    });

    if (cv.file_key) {
      const url = await s3Service.getSignedDownloadUrl(cv.file_key);
      return { url, cvId: cv.id };
    }

    this.res.setHeader("Content-Type", "text/html");
    this.res.send(html);
  }

  async download() {
    const cv = await this.db.CV.findOne({
      where: { id: this.req.params.id, user_id: this.req.user.id },
    });
    if (!cv) throw this.context.errorManager.getError("NOT_FOUND", "CV not found");

    if (cv.file_key) {
      const url = await s3Service.getSignedDownloadUrl(cv.file_key);
      return { url, file_name: cv.file_name, mime_type: cv.mime_type };
    }

    if (cv.file_path) {
      if (cv.mime_type === "text/html") {
        const fs = await import("fs");
        const html = fs.default.readFileSync(cv.file_path, "utf8");
        this.res.setHeader("Content-Type", "text/html");
        this.res.send(html);
        return;
      }
      this.res.download(cv.file_path, cv.file_name);
      return;
    }

    throw this.context.errorManager.getError("NOT_FOUND", "CV file not found");
  }
}

export default CVController;
