import bcrypt from "bcrypt";

const MANAGED_ROLES = new Set(["employee", "employer", "admin"]);

function transformUser(user) {
  const json = user.toJSON ? user.toJSON() : { ...user };
  delete json.password;
  json.full_name = `${json.first_name || ""} ${json.last_name || ""}`.trim();
  return json;
}

class AdminService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async listUsers() {
    const users = await this.db.User.findAll({
      attributes: { exclude: ["password"] },
      order: [["created_at", "DESC"]],
    });
    return users.map(transformUser);
  }

  async createUser(data) {
    const { email, password, role, email_verified } = data;
    const normalizedEmail = email.trim().toLowerCase();

    let first_name = data.first_name || data.firstName;
    let last_name = data.last_name || data.lastName;
    if (!first_name && data.full_name) {
      const parts = data.full_name.trim().split(/\s+/);
      first_name = parts[0] || "User";
      last_name = parts.slice(1).join(" ");
    }

    const existing = await this.db.User.findOne({ where: { email: normalizedEmail } });
    if (existing) throw this.errorManager.getError("EMAIL_ALREADY_EXISTS");

    const safeRole = MANAGED_ROLES.has(role) ? role : "employee";
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.db.User.create({
      email: normalizedEmail,
      password: hashedPassword,
      first_name: first_name || "User",
      last_name: last_name || "",
      role: safeRole,
      email_verified: email_verified !== false,
    });

    return transformUser(user);
  }

  async updateUser(id, updates) {
    const user = await this.db.User.findByPk(id);
    if (!user) throw this.errorManager.getError("USER_NOT_FOUND");

    const allowed = {};

    if (updates.first_name !== undefined) allowed.first_name = updates.first_name;
    if (updates.firstName !== undefined) allowed.first_name = updates.firstName;
    if (updates.last_name !== undefined) allowed.last_name = updates.last_name;
    if (updates.lastName !== undefined) allowed.last_name = updates.lastName;
    if (updates.full_name !== undefined) {
      const parts = updates.full_name.trim().split(/\s+/);
      allowed.first_name = parts[0] || user.first_name;
      allowed.last_name = parts.slice(1).join(" ") || user.last_name;
    }
    if (updates.role !== undefined) allowed.role = MANAGED_ROLES.has(updates.role) ? updates.role : user.role;
    if (updates.email_verified !== undefined) allowed.email_verified = Boolean(updates.email_verified);
    if (updates.emailVerified !== undefined) allowed.email_verified = Boolean(updates.emailVerified);
    if (updates.status !== undefined) allowed.status = updates.status;
    if (updates.password) {
      if (updates.password.length < 6) throw this.errorManager.getError("BAD_REQUEST", "Password must be at least 6 characters");
      allowed.password = await bcrypt.hash(updates.password, 12);
    }

    await user.update(allowed);
    return transformUser(user);
  }

  async deleteUser(id) {
    const user = await this.db.User.findByPk(id);
    if (!user) throw this.errorManager.getError("USER_NOT_FOUND");
    await user.destroy();
    return { success: true, user: transformUser(user) };
  }
}

export default AdminService;
