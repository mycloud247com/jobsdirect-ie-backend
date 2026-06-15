import crypto from "crypto";
import { getEmployerForUser, requireRole } from "../utils/employerLookup.js";

class TeamService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async _getEmployerForUser(user_id) {
    const employer = await getEmployerForUser(this.db, user_id);
    if (!employer) throw this.errorManager.getError("FORBIDDEN", "Employer profile required");
    return employer;
  }

  async _requireRole(user_id, employer_id, allowedRoles) {
    return requireRole(this.db, user_id, employer_id, allowedRoles, this.errorManager);
  }

  async list(user_id) {
    const employer = await this._getEmployerForUser(user_id);
    return this.db.EmployerTeamMember.findAll({
      where: { employer_id: employer.id },
      include: [{ model: this.db.User, as: "user", attributes: ["id", "email", "first_name", "last_name"] }],
      order: [["created_at", "ASC"]],
    });
  }

  async invite(user_id, email, role = "recruiter") {
    const employer = await this._getEmployerForUser(user_id);
    await this._requireRole(user_id, employer.id, ["owner", "admin"]);

    if (!["admin", "recruiter"].includes(role)) {
      throw this.errorManager.getError("BAD_REQUEST", "Role must be admin or recruiter");
    }

    // Check if already a team member
    const existing = await this.db.EmployerTeamMember.findOne({
      where: { employer_id: employer.id, email },
    });
    if (existing) {
      throw this.errorManager.getError("CONFLICT", "This person is already on your team");
    }

    // If email is already registered on the platform, reject
    const existingUser = await this.db.User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      throw this.errorManager.getError("BAD_REQUEST", "This email is already registered on JobsDirect.ie. They already have an account and role on the platform.");
    }

    // Not registered — send invite email
    const inviteToken = crypto.randomBytes(32).toString("hex");

    const member = await this.db.EmployerTeamMember.create({
      employer_id: employer.id,
      email,
      role,
      status: "pending",
      invite_token: inviteToken,
      invited_at: new Date(),
    });

    try {
      const { notify } = await import("./notifier.js");
      notify("TEAM_INVITE", {
        email,
        employer: { company_name: employer.company_name },
        invite_token: inviteToken,
        role,
      });
    } catch {}

    return { ...member.toJSON(), added_directly: false };
  }

  async getInviteDetails(token) {
    const member = await this.db.EmployerTeamMember.findOne({
      where: { invite_token: token, status: "pending" },
      include: [{ model: this.db.Employer, as: "employer", attributes: ["id", "company_name"] }],
    });
    if (!member) throw this.errorManager.getError("NOT_FOUND", "Invalid or expired invitation");
    return {
      email: member.email,
      role: member.role,
      company_name: member.employer?.company_name,
    };
  }

  async signupAndAccept(token, data) {
    const member = await this.db.EmployerTeamMember.findOne({
      where: { invite_token: token, status: "pending" },
    });
    if (!member) throw this.errorManager.getError("NOT_FOUND", "Invalid or expired invitation");

    // Create user account
    const bcrypt = await import("bcrypt");
    const { generateToken, setRefreshCookie } = await import("../../middlewares/authenticate.js");

    const existing = await this.db.User.findOne({ where: { email: member.email.toLowerCase() } });
    if (existing) throw this.errorManager.getError("CONFLICT", "An account with this email already exists. Please log in instead.");

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.db.User.create({
      email: member.email.toLowerCase(),
      password: hashedPassword,
      first_name: data.first_name,
      last_name: data.last_name,
      role: "employer",
      email_verified: true, // trusted — invite came via email
    });

    // Accept the invite
    await member.update({
      user_id: user.id,
      status: "active",
      invite_token: null,
      accepted_at: new Date(),
    });

    const tokenPayload = { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name };
    const accessToken = generateToken(tokenPayload, "access");
    const refreshToken = generateToken(tokenPayload, "refresh");

    return { user, accessToken, refreshToken };
  }

  async acceptInvite(token, user_id) {
    const member = await this.db.EmployerTeamMember.findOne({
      where: { invite_token: token, status: "pending" },
    });
    if (!member) throw this.errorManager.getError("NOT_FOUND", "Invalid or expired invite");

    // Verify email matches the user
    const user = await this.db.User.findByPk(user_id);
    if (!user || user.email !== member.email) {
      throw this.errorManager.getError("FORBIDDEN", "This invite is for a different email address");
    }

    await member.update({
      user_id,
      status: "active",
      invite_token: null,
      accepted_at: new Date(),
    });

    return member;
  }

  async updateRole(user_id, memberId, newRole) {
    const member = await this.db.EmployerTeamMember.findByPk(memberId);
    if (!member) throw this.errorManager.getError("NOT_FOUND", "Team member not found");

    await this._requireRole(user_id, member.employer_id, ["owner"]);

    if (member.role === "owner") {
      throw this.errorManager.getError("BAD_REQUEST", "Cannot change owner role");
    }

    await member.update({ role: newRole });
    return member;
  }

  async remove(user_id, memberId) {
    const member = await this.db.EmployerTeamMember.findByPk(memberId);
    if (!member) throw this.errorManager.getError("NOT_FOUND", "Team member not found");

    await this._requireRole(user_id, member.employer_id, ["owner", "admin"]);

    if (member.role === "owner") {
      throw this.errorManager.getError("BAD_REQUEST", "Cannot remove the owner");
    }

    await member.update({ status: "removed" });
    return { success: true };
  }

  /**
   * Called when employer is created — auto-add the owner.
   */
  async addOwner(employer_id, user_id, email) {
    return this.db.EmployerTeamMember.findOrCreate({
      where: { employer_id, role: "owner" },
      defaults: {
        employer_id,
        user_id,
        email,
        role: "owner",
        status: "active",
        accepted_at: new Date(),
      },
    });
  }
}

export default TeamService;
