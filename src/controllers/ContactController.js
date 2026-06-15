import ContactService from "../services/contact.js";
import { notify } from "../services/notifier.js";

class ContactController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.contactService = new ContactService(context);
  }

  async list() {
    return this.contactService.list(this.req.query);
  }

  async create() {
    const { name, email, phone, subject, message } = this.req.body;
    if (!name || !email || !message) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Name, email and message are required");
    }
    const record = await this.contactService.create({ name, email, phone, subject, message });

    // Send email notification to admin
    notify("CONTACT_RECEIVED", { name, email, phone, subject: subject || "(No subject)", message });

    return record;
  }

  async update() {
    return this.contactService.update(this.req.params.id, this.req.body);
  }

  async remove() {
    return this.contactService.remove(this.req.params.id);
  }
}

export default ContactController;
