import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken, setRefreshCookie, clearRefreshCookie } from "../../middlewares/authenticate.js";
import { notify } from "./notifier.js";

class AuthService {
  constructor(context) {
    this.context = context;
    this.db = context.db;
    this.req = context.req;
    this.res = context.res;
    this.errorManager = context.errorManager;
  }

  async register(data) {
    const { email, password, first_name = "", last_name = "", role } = data;
    const safeRole = role === "employer" ? "employer" : "employee";

    const existing = await this.db.User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw this.errorManager.getError("EMAIL_ALREADY_EXISTS");
    }

    // Anti-abuse: check for duplicate employer accounts (§19)
    if (safeRole === "employer" && data.company_name) {
      const { Op } = (await import("sequelize")).default;
      const dupeChecks = [];
      if (data.company_name) {
        dupeChecks.push(this.db.Employer.findOne({ where: { company_name: { [Op.iLike]: data.company_name.trim() } } }));
      }
      if (data.phone) {
        dupeChecks.push(this.db.Employer.findOne({ where: { phone: data.phone.trim() } }));
      }
      const [dupeByName, dupeByPhone] = await Promise.all(dupeChecks);
      if (dupeByName || dupeByPhone) {
        throw this.errorManager.getError("BAD_REQUEST", "An employer account with this company name or phone number already exists. Contact support if you need help.");
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await this.db.User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name: first_name,
      last_name: last_name,
      role: safeRole,
      verification_token: verificationToken,
      email_verified: false,
    });

    // Create minimal profile — everything else collected in dashboard profile/verification
    if (safeRole === "employer") {
      const employer = await this.db.Employer.create({
        user_id: user.id,
        first_name,
        last_name,
        company_name: data.company_name || "",
        verification_status: "draft",
      });
      // Create owner team member so requireRole() works
      await this.db.EmployerTeamMember.create({
        employer_id: employer.id,
        user_id: user.id,
        email: user.email,
        role: "owner",
        status: "active",
        accepted_at: new Date(),
      });
    } else {
      await this.db.Employee.create({
        user_id: user.id,
        first_name,
        last_name,
      });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const accessToken = generateToken(tokenPayload, "access");
    const refreshToken = generateToken(tokenPayload, "refresh");

    setRefreshCookie(this.res, refreshToken);

    // Send verification email (non-blocking)
    notify("VERIFICATION_EMAIL", { user, verification_token: verificationToken });

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async googleAuth(googleUser) {
    const { google_id, email, first_name, last_name, role } = googleUser;
    const safeRole = role === "employer" ? "employer" : "employee";

    // Check if user exists by google_id
    let user = await this.db.User.findOne({ where: { google_id: google_id } });
    let isNewUser = false;

    if (user) {
      if (!user.email_verified) {
        await user.update({ email_verified: true });
      }
    } else {
      // Check if email already exists (user registered with email/password)
      user = await this.db.User.findOne({ where: { email: email.toLowerCase() } });

      if (user) {
        // Link Google account to existing user
        await user.update({ google_id: google_id, email_verified: true });
      } else {
        // No existing account — require role (signup flow only)
        if (!role) {
          throw this.errorManager.getError("BAD_REQUEST", "No account found with this email. Please sign up first.");
        }
        user = await this.db.User.create({
          google_id: google_id,
          email: email.toLowerCase(),
          first_name: first_name,
          last_name: last_name,
          role: safeRole,
          password: null,
          email_verified: true,
        });
        isNewUser = true;

        // Create role-specific profile
        if (safeRole === "employer") {
          const employer = await this.db.Employer.create({
            user_id: user.id,
            first_name,
            last_name,
            company_name: "",
            verification_status: "draft",
          });
          await this.db.EmployerTeamMember.create({
            employer_id: employer.id,
            user_id: user.id,
            email: user.email,
            role: "owner",
            status: "active",
            accepted_at: new Date(),
          });
        } else {
          await this.db.Employee.create({
            user_id: user.id,
            first_name,
            last_name,
          });
        }

        notify("WELCOME", { user });
      }
    }

    if (user.status === "suspended") {
      throw this.errorManager.getError("FORBIDDEN", "Your account has been suspended");
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const accessToken = generateToken(tokenPayload, "access");
    const refreshToken = generateToken(tokenPayload, "refresh");

    setRefreshCookie(this.res, refreshToken);

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async login(data) {
    const { email, password } = data;

    const user = await this.db.User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw this.errorManager.getError("INVALID_CREDENTIALS");
    }

    if (user.status === "suspended") {
      throw this.errorManager.getError("FORBIDDEN", "Your account has been suspended");
    }

    if (!user.password) {
      throw this.errorManager.getError("BAD_REQUEST", "This account uses Google sign-in. Please use the Google button to log in.");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw this.errorManager.getError("INVALID_CREDENTIALS");
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const accessToken = generateToken(tokenPayload, "access");
    const refreshToken = generateToken(tokenPayload, "refresh");

    setRefreshCookie(this.res, refreshToken);

    if (!user.email_verified) {
      return {
        user: this.sanitizeUser(user),
        accessToken,
        email_verified: false,
      };
    }

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async verifyEmail(token) {
    const user = await this.db.User.findOne({ where: { verification_token: token } });
    if (!user) {
      throw this.errorManager.getError("INVALID_TOKEN", "Invalid or expired verification link");
    }

    await user.update({ email_verified: true, verification_token: null });

    notify("WELCOME", { user });

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    const accessToken = generateToken(tokenPayload, "access");
    const refreshToken = generateToken(tokenPayload, "refresh");
    setRefreshCookie(this.res, refreshToken);

    return { user: this.sanitizeUser(user), accessToken };
  }

  async resendVerification(userId) {
    const user = await this.db.User.findByPk(userId);
    if (!user) throw this.errorManager.getError("USER_NOT_FOUND");

    if (user.email_verified) {
      return { success: true, message: "Email already verified" };
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await user.update({ verification_token: verificationToken });

    notify("VERIFICATION_EMAIL", { user, verification_token: verificationToken });

    return { success: true, message: "Verification email sent" };
  }

  async getUserInfo(userId) {
    const user = await this.db.User.findOne({
      where: { id: userId },
      attributes: { exclude: ["password"] },
    });
    if (!user) throw this.errorManager.getError("USER_NOT_FOUND");
    return user;
  }

  async updateUserInfo(userId, data) {
    const allowed = ["first_name", "last_name", "phone"];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    await this.db.User.update(updates, { where: { id: userId } });
    return this.getUserInfo(userId);
  }

  async logout() {
    clearRefreshCookie(this.res);
    return { success: true };
  }

  async requestPasswordReset(email) {
    const user = await this.db.User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { success: true, message: "If an account exists, a reset link has been sent" };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.db.User.update(
      { reset_token: hashedToken, reset_token_expiry: expiry },
      { where: { id: user.id } }
    );

    notify("PASSWORD_RESET", { user, resetToken: rawToken });

    return { success: true, message: "If an account exists, a reset link has been sent" };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await this.db.User.findOne({
      where: {
        reset_token: hashedToken,
        reset_token_expiry: { [this.db.Sequelize.Op.gt]: new Date() },
      },
    });
    if (!user) throw this.errorManager.getError("INVALID_TOKEN");

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.db.User.update(
      { password: hashed, reset_token: null, reset_token_expiry: null },
      { where: { id: user.id } }
    );

    notify("PASSWORD_CHANGED", { user });

    return { success: true, message: "Password has been reset" };
  }

  sanitizeUser(user) {
    const { password, verification_token, reset_token, reset_token_expiry, ...safe } = user.toJSON();
    return safe;
  }
}

export default AuthService;
