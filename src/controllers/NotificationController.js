import NotificationService from "../services/notificationService.js";

class NotificationController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.notificationService = new NotificationService(context);
  }

  async list() {
    const page = Number(this.req.query.page) || 1;
    return this.notificationService.list(this.req.user.id, { page });
  }

  async markAsRead() {
    const { id } = this.req.params;
    return this.notificationService.markAsRead(id, this.req.user.id);
  }

  async markAllAsRead() {
    return this.notificationService.markAllAsRead(this.req.user.id);
  }

  async remove() {
    const { id } = this.req.params;
    return this.notificationService.remove(id, this.req.user.id);
  }
}

export default NotificationController;
