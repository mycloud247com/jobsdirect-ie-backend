class InvoiceService {
  constructor(context) {
    this.db = context.db;
  }

  async createInvoice({ user_id, amount, description, stripe_session_id, kind }) {
    const invoiceNumber = await this._generateInvoiceNumber();
    return this.db.Invoice.create({
      user_id,
      invoice_number: invoiceNumber,
      date: new Date().toISOString().split("T")[0],
      amount: amount / 100, // Stripe amounts are in cents
      vat_amount: 0,
      currency: "EUR",
      description,
      payment_method: "stripe",
      stripe_session_id,
      kind,
    });
  }

  async getInvoices(user_id, { page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const { count, rows } = await this.db.Invoice.findAndCountAll({
      where: { user_id },
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset,
    });
    return { items: rows, total: count, page, pageSize };
  }

  async _generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await this.db.Invoice.findOne({
      where: { invoice_number: { [this.db.Sequelize.Op.like]: `${prefix}%` } },
      order: [["created_at", "DESC"]],
    });
    let seq = 1;
    if (latest) {
      const lastNum = parseInt(latest.invoice_number.replace(prefix, ""), 10);
      if (!isNaN(lastNum)) seq = lastNum + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
  }
}

export default InvoiceService;
