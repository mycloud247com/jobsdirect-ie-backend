class NotificationService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async list(user_id, { page = 1, pageSize = 20 } = {}) {
    const offset = (Math.max(1, page) - 1) * pageSize;
    const { count, rows } = await this.db.Notification.findAndCountAll({
      where: { user_id },
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset,
    });
    return {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      unreadCount: await this.db.Notification.count({ where: { user_id, is_read: false } }),
    };
  }

  async markAsRead(id, user_id) {
    const notification = await this.db.Notification.findOne({ where: { id, user_id } });
    if (!notification) throw this.errorManager.getError("NOT_FOUND", "Notification not found");
    await notification.update({ is_read: true });
    return notification;
  }

  async markAllAsRead(user_id) {
    await this.db.Notification.update({ is_read: true }, { where: { user_id, is_read: false } });
    return { success: true };
  }

  async create(data) {
    const notification = await this.db.Notification.create(data);
    // In future, emit socket event here
    return notification;
  }

  async remove(id, user_id) {
    const notification = await this.db.Notification.findOne({ where: { id, user_id } });
    if (!notification) throw this.errorManager.getError("NOT_FOUND", "Notification not found");
    await notification.destroy();
    return { success: true };
  }
}

export default NotificationService;
