function transformEmployee(employee) {
  if (!employee) return null;
  const json = employee.toJSON ? employee.toJSON() : { ...employee };

  // Parse skills if it's a string
  if (typeof json.skills === "string") {
    try {
      json.skills = JSON.parse(json.skills);
    } catch {
      json.skills = json.skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Add user_email from association
  if (json.user) {
    json.user_email = json.user.email;
  }

  return json;
}

/**
 * Strip fields the admin has marked hidden in employee_candidate_view_config.
 * Only applied when an employer views a candidate — not for the employee's own profile.
 */
function applyCandidateViewConfig(item, viewConfig) {
  if (!viewConfig || !Object.keys(viewConfig).length) return item;
  const filtered = { ...item };
  for (const [key, control] of Object.entries(viewConfig)) {
    if (control?.visible === false && key in filtered) {
      if (Array.isArray(filtered[key])) filtered[key] = [];
      else filtered[key] = null;
    }
  }
  return filtered;
}

class EmployeeService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async _getCandidateViewConfig() {
    const setting = await this.db.SiteSetting.findOne({ where: { key: "site_settings" } });
    return setting?.value?.employee_candidate_view_config || {};
  }

  async list(query = {}, userContext = null) {
    const { Op } = this.db.Sequelize;
    const where = {};
    
    // Default to only searchable/completed profiles for non-admin general lists
    const isAdmin = userContext?.role === "admin";
    if (!isAdmin && !query.user_id && !query.user_email) {
      where.is_searchable = true;
      where.profile_completed = true;
    }

    if (query.is_searchable !== undefined) where.is_searchable = query.is_searchable === 'true' || query.is_searchable === true;
    if (query.profile_completed !== undefined) where.profile_completed = query.profile_completed === 'true' || query.profile_completed === true;

    if (query.user_id) where.user_id = query.user_id;
    
    // Filters
    if (query.location) {
      where.location = { [Op.iLike]: `%${query.location}%` };
    }
    if (query.county) {
      where.county = query.county;
    }
    if (query.experience_years && Number(query.experience_years) > 0) {
      where.experience_years = { [Op.gte]: Number(query.experience_years) };
    }
    if (query.skills) {
      // skills is stored as a JSON string in TEXT column
      where.skills = { [Op.iLike]: `%${query.skills}%` };
    }
    if (query.q) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${query.q}%` } },
        { last_name: { [Op.iLike]: `%${query.q}%` } },
        { "$user.first_name$": { [Op.iLike]: `%${query.q}%` } },
        { "$user.last_name$": { [Op.iLike]: `%${query.q}%` } },
        { title: { [Op.iLike]: `%${query.q}%` } },
        { bio: { [Op.iLike]: `%${query.q}%` } },
        { skills: { [Op.iLike]: `%${query.q}%` } },
        { "$user.email$": { [Op.iLike]: `%${query.q}%` } },
      ];
    }

    // Resolve user_email to userId
    if (query.user_email) {
      const user = await this.db.User.findOne({ where: { email: query.user_email } });
      if (user) where.user_id = user.id;
      else return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    const order = [["created_at", "DESC"]];
    const include = [{ model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] }];

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const { count, rows } = await this.db.Employee.findAndCountAll({ 
      where, 
      order, 
      include, 
      limit: pageSize, 
      offset, 
      distinct: true 
    });

    const items = rows.map(transformEmployee);

    // Resolve CV URLs for all items
    for (const item of items) {
      if (!item.cv_url) {
        item.cv_url = await this._getCVUrl(item.user_id, item.cv_url);
      }
    }

    // Apply Privacy Redaction if not subscribed
    const isOwnProfile = userContext?.id && (query.user_id === userContext.id || query.user_email === userContext?.email);
    const employerRecord = userContext?.employer;
    const hasDbAccess = employerRecord?.candidate_database_access || employerRecord?.dataValues?.candidate_database_access;
    const canViewDetails = isAdmin || isOwnProfile || hasDbAccess;

    // Apply admin candidate view config (strip fields hidden by admin) — only for employer views
    const viewConfig = (isAdmin || isOwnProfile) ? {} : await this._getCandidateViewConfig();

    const redactedItems = items.map(item => {
      // Own profile — no redaction or config filtering
      if (isOwnProfile || (userContext?.id && item.user_id === userContext.id)) return item;

      const filtered = isAdmin ? item : applyCandidateViewConfig(item, viewConfig);
      if (canViewDetails) return filtered;

      // Redact sensitive fields for non-subscribers
      return {
        ...filtered,
        phone: "[Hidden]",
        cv_url: null,
        user_email: "[Hidden]",
        user: {
          ...filtered.user,
          email: "[Hidden]"
        }
      };
    });

    return { items: redactedItems, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
  }

  async _getCVUrl(user_id, existing_url) {
    if (existing_url) return existing_url;
    
    // Find default CV
    const cv = await this.db.CV.findOne({
      where: { user_id, is_default: true },
      order: [["created_at", "DESC"]]
    }) || await this.db.CV.findOne({
      where: { user_id },
      order: [["created_at", "DESC"]]
    });

    if (cv?.file_key) {
      const { default: s3Service } = await import("./s3Service.js");
      try {
        return await s3Service.getSignedDownloadUrl(cv.file_key);
      } catch (err) {
        console.error("Error signing CV URL:", err);
        return null;
      }
    }
    
    return null;
  }

  async getById(id, userContext = null) {
    const { Op } = this.db.Sequelize;
    const employee = await this.db.Employee.findOne({
      where: {
        [Op.or]: [{ id }, { user_id: id }]
      },
      include: [{ model: this.db.User, as: "user", attributes: { exclude: ["password"] } }],
    });
    if (!employee) throw this.errorManager.getError("NOT_FOUND", "Employee profile not found");
    const item = transformEmployee(employee);

    if (!item.cv_url) {
      item.cv_url = await this._getCVUrl(item.user_id, item.cv_url);
    }

    const isAdmin = userContext?.role === "admin";
    const isOwnProfile = userContext?.id && (item.user_id === userContext.id);

    // Own profile — no redaction
    if (isOwnProfile) return item;

    const employerRecord = userContext?.employer;
    const hasDbAccess = employerRecord?.candidate_database_access || employerRecord?.dataValues?.candidate_database_access;
    const canViewDetails = isAdmin || hasDbAccess;

    // Apply admin candidate view config (strip fields hidden by admin)
    const viewConfig = isAdmin ? {} : await this._getCandidateViewConfig();
    const filtered = isAdmin ? item : applyCandidateViewConfig(item, viewConfig);

    if (canViewDetails) return filtered;

    // Redact sensitive fields for non-subscribers
    return {
      ...filtered,
      phone: "[Hidden]",
      cv_url: null,
      user_email: "[Hidden]",
      user: {
        ...filtered.user,
        email: "[Hidden]"
      }
    };
  }

  async getByUserId(user_id) {
    const employee = await this.db.Employee.findOne({
      where: { user_id },
      include: [{ model: this.db.User, as: "user", attributes: { exclude: ["password"] } }],
    });
    if (!employee) return null;
    return transformEmployee(employee);
  }

  async create(data, user) {
    data.user_id = user.id;

    // Clean up empty/invalid date strings
    const dateFields = ["date_of_birth", "cv_plan_purchased_at"];
    for (const field of dateFields) {
      if (data[field] === "" || data[field] === "Invalid date") {
        data[field] = null;
      }
    }

    // Clean up empty numeric fields
    const numericFields = ["experience_years", "expected_salary"];
    for (const field of numericFields) {
      if (data[field] === "" || data[field] === undefined) {
        data[field] = null;
      }
    }

    // Strip redacted placeholder values — never persist "[Hidden]"
    for (const [key, val] of Object.entries(data)) {
      if (val === "[Hidden]") data[key] = null;
    }

    // Skills: frontend sends array, DB stores TEXT
    if (Array.isArray(data.skills)) {
      data.skills = JSON.stringify(data.skills);
    }

    const employee = await this.db.Employee.create(data);
    return this.getById(employee.id);
  }

  async update(id, updates) {
    const employee = await this.db.Employee.findByPk(id);
    if (!employee) throw this.errorManager.getError("NOT_FOUND", "Employee profile not found");

    // Clean up empty/invalid date strings
    const dateFields = ["date_of_birth", "cv_plan_purchased_at"];
    for (const field of dateFields) {
      if (updates[field] === "" || updates[field] === "Invalid date") {
        updates[field] = null;
      }
    }

    // Clean up empty numeric fields
    const numericFields = ["experience_years", "expected_salary"];
    for (const field of numericFields) {
      if (updates[field] === "" || updates[field] === undefined) {
        updates[field] = null;
      }
    }

    // Strip redacted placeholder values — never persist "[Hidden]"
    for (const [key, val] of Object.entries(updates)) {
      if (val === "[Hidden]") updates[key] = null;
    }

    // Skills: frontend sends array, DB stores TEXT
    if (Array.isArray(updates.skills)) {
      updates.skills = JSON.stringify(updates.skills);
    }

    await employee.update(updates);
    return this.getById(id);
  }

  async remove(id) {
    const employee = await this.db.Employee.findByPk(id);
    if (!employee) throw this.errorManager.getError("NOT_FOUND", "Employee profile not found");
    await employee.destroy();
    return { success: true };
  }
}

export default EmployeeService;
