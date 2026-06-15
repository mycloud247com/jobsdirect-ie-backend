import PaymentService from "../services/payment.js";
import CreditService from "../services/creditService.js";
import InvoiceService from "../services/invoiceService.js";

class PaymentController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.paymentService = new PaymentService(context);
    this.creditService = new CreditService(context);
  }

  async listPlans() {
    return this.paymentService.listPlans();
  }

  async checkout() {
    const planId = String(this.req.body?.plan_id || "").trim();
    if (!planId) {
      throw this.context.errorManager.getError("BAD_REQUEST", "Plan ID is required");
    }
    return this.paymentService.createCheckoutSession(planId, this.req.user, this.req.body?.employer_id);
  }

  async syncSession() {
    const sessionId = String(this.req.body?.session_id || "").trim();
    if (!/^cs_/.test(sessionId)) {
      throw this.context.errorManager.getError("BAD_REQUEST", "A valid Stripe Checkout Session ID is required");
    }
    return this.paymentService.syncSession(sessionId, this.req.user);
  }

  async portal() {
    return this.paymentService.createPortalSession(this.req.user, this.req.body?.employer_id);
  }

  async list() {
    return this.paymentService.list(this.req.query);
  }

  async getPricing() {
    return this.paymentService.getPricing();
  }

  async getBalance() {
    return this.paymentService.getEmployerBalance(this.req.user.id, this.req.query?.employer_id);
  }

  async transactions() {
    const employerId = this.req.query?.employer_id;
    const page = Number(this.req.query?.page) || 1;
    const pageSize = Number(this.req.query?.pageSize) || 20;

    // Resolve employer for this user
    const employer = await this.paymentService.findEmployerForPayment(this.req.user.id, employerId);
    if (!employer) throw this.context.errorManager.getError("EMPLOYER_NOT_FOUND");

    return this.creditService.getLedger(employer.id, { page, pageSize });
  }

  async getInvoices() {
    const { page = 1, pageSize = 20 } = this.req.query;
    const invoiceService = new InvoiceService(this.context);
    return invoiceService.getInvoices(this.req.user.id, { page: Number(page), pageSize: Number(pageSize) });
  }
}

export default PaymentController;
