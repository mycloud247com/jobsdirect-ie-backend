import AuthService from "../services/auth.js";

class AuthController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.authService = new AuthService(context);
  }

  async register() {
    const { email, password, role } = this.req.body;
    if (!email || !password) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Email and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Please enter a valid email address");
    }
    if (password.length < 8) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Password must be at least 8 characters");
    }
    return this.authService.register(this.req.body);
  }

  async login() {
    const { email, password } = this.req.body;
    if (!email || !password) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Email and password are required");
    }
    return this.authService.login({ email, password });
  }

  async googleAuth() {
    const { credential, role } = this.req.body;
    if (!credential) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Google credential is required");
    }

    const payload = await this.verifyGoogleToken(credential);

    return this.authService.googleAuth({
      google_id: payload.sub,
      email: payload.email,
      first_name: payload.given_name || payload.name?.split(" ")[0] || "",
      last_name: payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "",
      role,
    });
  }

  async verifyGoogleToken(credential) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!res.ok) {
      throw this.context.errorManager.getError("UNAUTHORIZED", "Invalid Google token");
    }
    const payload = await res.json();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      throw this.context.errorManager.getError("UNAUTHORIZED", "Google token audience mismatch");
    }

    if (!payload.email) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Google account has no email");
    }

    return payload;
  }

  async verifyEmail() {
    const { token } = this.req.body;
    if (!token) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Verification token is required");
    }
    return this.authService.verifyEmail(token);
  }

  async resendVerification() {
    return this.authService.resendVerification(this.req.user.id);
  }

  async refresh() {
    const { refreshAccessToken } = await import("../../middlewares/authenticate.js");
    const { accessToken, user } = await refreshAccessToken(this.req);
    return { accessToken, user };
  }

  async logout() {
    return this.authService.logout();
  }

  async getUserInfo() {
    return this.authService.getUserInfo(this.req.user.id);
  }

  async updateUserInfo() {
    return this.authService.updateUserInfo(this.req.user.id, this.req.body);
  }

  async forgotPassword() {
    const { email } = this.req.body;
    if (!email) throw this.context.errorManager.getError("BAD_REQUEST", "Email is required");
    return this.authService.requestPasswordReset(email);
  }

  async resetPassword() {
    const { token, password } = this.req.body;
    if (!token || !password) throw this.context.errorManager.getError("BAD_REQUEST", "Token and password are required");
    if (password.length < 8) throw this.context.errorManager.getError("BAD_REQUEST", "Password must be at least 8 characters");
    return this.authService.resetPassword(token, password);
  }

  async deleteAccount() {
    const AccountService = (await import("../services/accountService.js")).default;
    const accountService = new AccountService(this.context);
    return accountService.deleteAccount(this.req.user.id);
  }
}

export default AuthController;
