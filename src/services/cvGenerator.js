import s3Service from "./s3Service.js";

const TEMPLATES = {
  basic: { accent: "#3d5a80", font: "'Source Sans Pro', 'Segoe UI', Arial, sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap" },
  modern: { accent: "#2563eb", font: "'Inter', 'Segoe UI', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" },
  executive: { accent: "#1e293b", font: "'Merriweather', Georgia, serif", fontUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap" },
  creative: { accent: "#7c3aed", font: "'Poppins', sans-serif", fontUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" },
};

class CVGenerator {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  // Backward compat
  async generateBasicCV(user_id) {
    return this.generateCV(user_id, { template_id: "basic", show_watermark: true });
  }

  async generateCV(user_id, opts = {}) {
    const { cv_id, template_id = "basic", show_watermark = true } = opts;

    const employee = await this.db.Employee.findOne({
      where: { user_id },
      include: [{ model: this.db.User, as: "user", attributes: ["email", "first_name", "last_name"] }],
    });
    if (!employee) throw this.errorManager.getError("NOT_FOUND", "Employee profile not found");

    // If cv_id provided, use per-CV content; otherwise fall back to profile
    let cv_record = null;
    if (cv_id) {
      cv_record = await this.db.CV.findOne({ where: { id: cv_id, user_id } });
    }

    const user = employee.user;
    const name = `${user.first_name} ${user.last_name}`;

    // Resolve content: CV-specific overrides profile
    const rawTitle = cv_record?.title || employee.title || "";
    const rawBio = cv_record?.bio || employee.bio || "";
    const rawSkills = cv_record?.skills || employee.skills || "";
    const skills = typeof rawSkills === "string"
      ? (() => { try { return JSON.parse(rawSkills); } catch { return rawSkills.split(",").map(s => s.trim()).filter(Boolean); } })()
      : (rawSkills || []);
    const workExp = Array.isArray(cv_record?.work_experience) ? cv_record.work_experience : (Array.isArray(employee.work_experience) ? employee.work_experience : []);
    const education = Array.isArray(cv_record?.education) ? cv_record.education : (Array.isArray(employee.education) ? employee.education : []);
    const certifications = Array.isArray(cv_record?.certifications) ? cv_record.certifications : (Array.isArray(employee.certifications) ? employee.certifications : []);
    const projects = Array.isArray(cv_record?.projects) ? cv_record.projects : (Array.isArray(employee.projects) ? employee.projects : []);

    const tpl = TEMPLATES[template_id] || TEMPLATES.basic;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV — ${name}</title>
  <style>
    @import url('${tpl.fontUrl}');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${tpl.font}; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 32px 40px; font-size: 10.5pt; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1.5px solid ${tpl.accent}; margin-bottom: 6px; }
    .header-left, .header-right { font-size: 9pt; color: #555; line-height: 1.5; }
    .header-right { text-align: right; }
    .header-center { text-align: center; }
    .header-center h1 { font-size: 22pt; font-weight: 700; color: #1a1a1a; letter-spacing: 0.5px; }
    .header-center .title { font-size: 12pt; color: ${tpl.accent}; font-weight: 600; margin-top: 2px; }
    .header a { color: ${tpl.accent}; text-decoration: none; }
    .about { font-size: 9.5pt; color: #444; margin-bottom: 10px; line-height: 1.5; }
    .section { margin-bottom: 8px; }
    .section-title { font-size: 10.5pt; color: ${tpl.accent}; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; padding-bottom: 2px; border-bottom: 0.75px solid #ccc; margin-bottom: 6px; }
    .exp-item { margin-bottom: 8px; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
    .exp-header h3 { font-size: 10.5pt; font-weight: 700; }
    .exp-header .date { font-size: 9.5pt; color: #555; }
    .exp-sub { display: flex; justify-content: space-between; font-size: 9.5pt; color: #666; font-style: italic; margin-bottom: 3px; }
    .exp-bullets { padding-left: 16px; font-size: 9.5pt; }
    .exp-bullets li { margin-bottom: 2px; }
    .edu-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9.5pt; }
    .edu-row strong { font-weight: 700; }
    .edu-row .inst { font-style: italic; }
    .edu-row .date { color: #555; }
    .watermark { text-align: center; margin-top: 24px; padding-top: 10px; border-top: 0.5px solid #ddd; color: #bbb; font-size: 8pt; }
    @media print { body { padding: 16px 24px; } .watermark { color: #ddd; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${employee.phone ? `${employee.phone}<br>` : ""}
      ${employee.location || employee.county || ""}<br>
      <a href="mailto:${user.email}">${user.email}</a>
    </div>
    <div class="header-center">
      <h1>${name}</h1>
      ${rawTitle ? `<div class="title">${rawTitle}</div>` : ""}
    </div>
    <div class="header-right">
      ${employee.linkedin ? `<a href="${employee.linkedin}">LinkedIn</a><br>` : ""}
      ${employee.github ? `<a href="${employee.github}">GitHub</a><br>` : ""}
      ${employee.website ? `<a href="${employee.website}">Website</a><br>` : ""}
      ${employee.languages ? `Languages: ${employee.languages}` : ""}
    </div>
  </div>

  ${rawBio ? `<p class="about">${rawBio}</p>` : ""}

  ${skills.length ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div style="font-size:9.5pt">${skills.join(" &bull; ")}</div>
  </div>` : ""}

  ${workExp.length ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${workExp.map(w => `
    <div class="exp-item">
      <div class="exp-header">
        <h3>${w.job_title || w.title || ""}</h3>
        <span class="date">${w.start_date || ""}${w.end_date ? ` — ${w.end_date}` : w.current ? " — Present" : ""}${!w.start_date && w.duration ? w.duration : ""}</span>
      </div>
      <div class="exp-sub">
        <span>${w.company || ""}</span>
        <span>${w.location || ""}</span>
      </div>
      ${w.responsibilities ? `<ul class="exp-bullets">${w.responsibilities.split("\n").filter(Boolean).map(r => `<li>${r.replace(/^[-•]\s*/, "")}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(e => `
    <div class="edu-row">
      <div><strong>${e.degree || ""}</strong>${e.field_of_study ? ` in ${e.field_of_study}` : ""}${e.institution ? `, <span class="inst">${e.institution}</span>` : ""}${e.grade ? ` — ${e.grade}` : ""}</div>
      <span class="date">${e.start_date || ""}${e.end_date ? ` — ${e.end_date}` : ""}${!e.start_date && e.duration ? e.duration : ""}</span>
    </div>
    ${e.description ? `<div style="font-size:9pt;color:#666;font-style:italic;margin-bottom:4px">${e.description}</div>` : ""}`).join("")}
  </div>` : ""}

  ${certifications.length ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${certifications.map(c => `
    <div class="edu-row">
      <div><strong>${c.name || ""}</strong>${c.issuing_organisation ? `, <span class="inst">${c.issuing_organisation}</span>` : ""}${c.credential_id ? ` — ID: ${c.credential_id}` : ""}</div>
      <span class="date">${c.issue_date || ""}${c.expiry_date ? ` — ${c.expiry_date}` : ""}</span>
    </div>`).join("")}
  </div>` : ""}

  ${projects.length ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `
    <div class="exp-item">
      <div class="exp-header">
        <h3>${p.name || ""}${p.url ? ` — <a href="${p.url}" style="font-weight:400;font-size:9pt">${p.url}</a>` : ""}</h3>
        <span class="date">${p.start_date || ""}${p.end_date ? ` — ${p.end_date}` : ""}</span>
      </div>
      ${p.description ? `<p style="font-size:9.5pt;color:#444;margin-top:2px">${p.description}</p>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${show_watermark ? `<div class="watermark">Generated by JobsDirect.ie &mdash; ${new Date().toLocaleDateString("en-IE")}</div>` : ""}
</body>
</html>`;

    const file_name = `${name.replace(/\s+/g, "_")}_CV_${Date.now()}.html`;
    const { key } = await s3Service.uploadHTML(html, "cvs", file_name);

    const tplLabel = (TEMPLATES[template_id] ? template_id : "basic").charAt(0).toUpperCase() + template_id.slice(1);
    const cv_type = show_watermark ? "generated_free" : "generated_pro";

    if (cv_record) {
      // Update existing CV record with new generated file
      if (cv_record.file_key) {
        try { await s3Service.deleteFile(cv_record.file_key); } catch {}
      }
      await cv_record.update({ file_name, file_key: key, mime_type: "text/html", template_id, name: `${tplLabel} CV` });
      return { html, cv: cv_record };
    }

    // Find existing generated CV for this template, or any generated CV to update
    let cv = await this.db.CV.findOne({
      where: { user_id, template_id, type: { [this.db.Sequelize.Op.like]: "generated_%" } },
    });

    if (cv) {
      if (cv.file_key) {
        try { await s3Service.deleteFile(cv.file_key); } catch {}
      }
      await cv.update({ file_name, file_key: key, mime_type: "text/html", template_id, type: cv_type, name: `${tplLabel} CV` });
      return { html, cv };
    }

    // Create new CV record
    cv = await this.db.CV.create({
      user_id,
      name: `${tplLabel} CV`,
      type: cv_type,
      file_name,
      file_key: key,
      mime_type: "text/html",
      template_id,
    });

    return { html, cv };
  }
}

export default CVGenerator;
