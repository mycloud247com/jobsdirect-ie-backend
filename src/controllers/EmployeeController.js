import EmployeeService from "../services/employee.js";

class EmployeeController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.employeeService = new EmployeeService(context);
  }

  async list() {
    const { getEmployerForUser } = await import("../utils/employerLookup.js");
    const employer = await getEmployerForUser(this.context.db, this.req.user?.id);
    
    // Ensure we have a plain object for userContext
    const user = this.req.user && typeof this.req.user.get === "function" 
      ? this.req.user.get({ plain: true }) 
      : this.req.user;

    const userContext = { ...user, employer };
    
    return this.employeeService.list(this.req.query, userContext);
  }

  async getById() {
    const { getEmployerForUser } = await import("../utils/employerLookup.js");
    const employer = await getEmployerForUser(this.context.db, this.req.user?.id);
    const userContext = { ...this.req.user, employer };
    return this.employeeService.getById(this.req.params.id, userContext);
  }

  async getByUser() {
    return this.employeeService.getByUserId(this.req.user.id);
  }

  async create() {
    return this.employeeService.create(this.req.body, this.req.user);
  }

  async update() {
    return this.employeeService.update(this.req.params.id, this.req.body);
  }

  async remove() {
    return this.employeeService.remove(this.req.params.id);
  }
}

export default EmployeeController;
