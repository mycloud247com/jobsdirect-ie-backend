import AdminService from "../services/admin.js";

class AdminController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.adminService = new AdminService(context);
  }

  async listUsers() {
    return this.adminService.listUsers();
  }

  async createUser() {
    const { email, password, first_name, last_name, role, email_verified, firstName, lastName, emailVerified } = this.req.body;
    if (!email || !password) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Email and password are required");
    }
    if (password.length < 6) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Password must be at least 6 characters");
    }
    return this.adminService.createUser({ 
      email, 
      password, 
      first_name: first_name || firstName, 
      last_name: last_name || lastName, 
      role, 
      email_verified: email_verified !== undefined ? email_verified : emailVerified 
    });
  }

  async updateUser() {
    return this.adminService.updateUser(this.req.params.id, this.req.body);
  }

  async deleteUser() {
    if (this.req.params.id === this.req.user.id) {
      throw this.context.errorManager.getError("BAD_REQUEST", "You cannot delete your own account");
    }
    return this.adminService.deleteUser(this.req.params.id);
  }

}


export default AdminController;
