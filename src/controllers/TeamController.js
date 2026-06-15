import TeamService from "../services/teamService.js";

class TeamController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.teamService = new TeamService(context);
  }

  async list() {
    return this.teamService.list(this.req.user.id);
  }

  async invite() {
    const { email, role } = this.req.body;
    if (!email) throw this.context.errorManager.getError("BAD_REQUEST", "Email is required");
    return this.teamService.invite(this.req.user.id, email, role);
  }

  async getInviteDetails() {
    const { token } = this.req.query;
    if (!token) throw this.context.errorManager.getError("BAD_REQUEST", "Token is required");
    return this.teamService.getInviteDetails(token);
  }

  async signupAndAccept() {
    const { token, first_name, last_name, password } = this.req.body;
    if (!token || !first_name || !last_name || !password) {
      throw this.context.errorManager.getError("BAD_REQUEST", "All fields are required");
    }
    if (password.length < 8) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Password must be at least 8 characters");
    }
    const { setRefreshCookie } = await import("../../middlewares/authenticate.js");
    const result = await this.teamService.signupAndAccept(token, { first_name, last_name, password });
    setRefreshCookie(this.context.res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  async acceptInvite() {
    const { token } = this.req.body;
    if (!token) throw this.context.errorManager.getError("BAD_REQUEST", "Invite token is required");
    return this.teamService.acceptInvite(token, this.req.user.id);
  }

  async updateRole() {
    const { role } = this.req.body;
    return this.teamService.updateRole(this.req.user.id, this.req.params.id, role);
  }

  async remove() {
    return this.teamService.remove(this.req.user.id, this.req.params.id);
  }
}

export default TeamController;
