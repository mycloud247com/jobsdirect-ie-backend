import JobAlertService from "../services/jobAlertService.js";

class JobAlertController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.jobAlertService = new JobAlertService(context);
  }

  async list() {
    return this.jobAlertService.list(this.req.user.id);
  }

  async create() {
    return this.jobAlertService.create(this.req.user.id, this.req.body);
  }

  async update() {
    return this.jobAlertService.update(this.req.params.id, this.req.user.id, this.req.body);
  }

  async toggle() {
    return this.jobAlertService.toggle(this.req.params.id, this.req.user.id);
  }

  async remove() {
    return this.jobAlertService.remove(this.req.params.id, this.req.user.id);
  }
}

export default JobAlertController;
