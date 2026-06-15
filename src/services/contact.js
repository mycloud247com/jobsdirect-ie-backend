class ContactService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async list(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;

    return this.db.ContactMessage.findAll({
      where,
      order: [["created_at", "DESC"]],
    });
  }

  async create(data) {
    return this.db.ContactMessage.create(data);
  }

  async update(id, updates) {
    const message = await this.db.ContactMessage.findByPk(id);
    if (!message) throw this.errorManager.getError("NOT_FOUND", "Contact message not found");
    await message.update(updates);
    return message;
  }

  async remove(id) {
    const message = await this.db.ContactMessage.findByPk(id);
    if (!message) throw this.errorManager.getError("NOT_FOUND", "Contact message not found");
    await message.destroy();
    return { success: true };
  }
}

export default ContactService;
