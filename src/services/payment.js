const STRIPE_API_BASE = "https://api.stripe.com/v1";
import { getEmployerForUser } from "../utils/employerLookup.js";

// ─── Duration configs ───
const LISTING_CONFIG = {
  FREE_LISTING_DAYS: 14,
  PAID_LISTING_DAYS: 30,
};

// Keys that map to Stripe products for job-posting cost items.
const PRICING_KEYS = ["JOB_LISTING", "DUPLICATE_JOB", "IMPORT_JOB", "ADDON_HIGHLIGHT"];

/**
 * Check if employer can post a free job.
 * Spec §4.1: "1 active free listing per employer at a time"
 * They can post another free job once their current one expires.
 * @param {object} employer - Employer record
 * @param {object} db - Database instance (needed to check active free listings)
 */
export async function canPostFreeJob(employer, db) {
  if (!db) {
    // Fallback for callers that don't pass db — use old field check
    if (!employer.last_free_job_at) return true;
    const cooldownMs = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(employer.last_free_job_at).getTime() >= cooldownMs;
  }
  const { Op } = await import("sequelize");
  const activeFreeCount = await db.Job.count({
    where: {
      employer_id: employer.id,
      listing_type: "free",
      status: "approved",
      expires_at: { [Op.gt]: new Date() },
    },
  });
  return activeFreeCount === 0;
}

class PaymentService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  // ─── Config from site settings ───

  async _getSiteSettings() {
    const setting = await this.db.SiteSetting.findOne({ where: { key: "site_settings" } });
    return setting?.value || {};
  }

  async _getProducts() {
    const settings = await this._getSiteSettings();
    return Array.isArray(settings.products) ? settings.products.filter((p) => p.enabled !== false) : [];
  }

  async _getPlans() {
    // Legacy compat: check products first, fall back to payment_plans
    const settings = await this._getSiteSettings();
    if (Array.isArray(settings.products)) {
      return settings.products.filter((p) => p.enabled !== false && (p.type === "credit_bundle" || p.type === "subscription" || p.type === "cv_plan"));
    }
    return Array.isArray(settings.payment_plans) ? settings.payment_plans : [];
  }

  async _findPlan(planId) {
    const plans = await this._getPlans();
    return plans.find((p) => p.id === planId) || null;
  }

  /**
   * Fetch the default price for a Stripe product.
   * Returns { price_id, unit_amount, currency, recurring } or null.
   */
  async _fetchDefaultPrice(stripeProductId) {
    if (!stripeProductId) return null;
    try {
      const product = await this.stripeRequest(
        `/products/${encodeURIComponent(stripeProductId)}`,
        null,
        "GET",
      );
      const defaultPriceId = product.default_price;
      if (!defaultPriceId) return null;

      const priceId = typeof defaultPriceId === "string" ? defaultPriceId : defaultPriceId.id;
      const price = typeof defaultPriceId === "object" && defaultPriceId.unit_amount !== undefined
        ? defaultPriceId
        : await this.stripeRequest(`/prices/${encodeURIComponent(priceId)}`, null, "GET");

      return {
        price_id: priceId,
        unit_amount: price.unit_amount,
        currency: price.currency || "eur",
        recurring: price.recurring || null,
      };
    } catch {
      return null;
    }
  }

  // ─── Public API ───

  /**
   * Resolve pricing for job cost items. Fetches each product's default price from Stripe.
   * Returns { JOB_28_DAY: cents, ADDON_FEATURED: cents, ... }
   */
  async getPricing() {
    const settings = await this._getSiteSettings();
    const products = settings.pricing_products || {};

    const entries = await Promise.all(
      PRICING_KEYS.map(async (key) => {
        const productId = products[key];
        if (!productId) return [key, 0];
        const priceData = await this._fetchDefaultPrice(productId);
        return [key, priceData?.unit_amount || 0];
      }),
    );

    return {
      ...Object.fromEntries(entries),
      ...LISTING_CONFIG,
    };
  }

  async listPlans() {
    const plans = await this._getPlans();

    const results = await Promise.all(
      plans.map(async (plan) => {
        const priceData = await this._fetchDefaultPrice(plan.stripe_product_id);

        return {
          id: plan.id,
          name: plan.name || plan.label,
          label: plan.name || plan.label,
          description: plan.description,
          type: plan.type || plan.kind,
          kind: plan.type === "credit_bundle" ? "credits" : plan.type === "subscription" ? "candidate_database" : plan.type === "cv_plan" ? "cv_plan" : (plan.kind || plan.type),
          credits: plan.credits || 0,
          credit_cost: plan.credit_cost || 0,
          cv_plan_tier: plan.cv_plan_tier || null,
          mode: plan.type === "subscription" ? "subscription" : (plan.mode || "payment"),
          amount: priceData?.unit_amount || null,
          currency: priceData?.currency || "eur",
          interval: priceData?.recurring?.interval || (plan.type === "subscription" ? "month" : null),
        };
      }),
    );

    return results;
  }

  async getEmployerBalance(userId, employerId) {
    const employer = await this.findEmployerForPayment(userId, employerId);
    if (!employer) return null;

    // Sync subscription status from Stripe if employer has a subscription
    if (employer.candidate_database_subscription_id) {
      try {
        const sub = await this.stripeRequest(
          `/subscriptions/${encodeURIComponent(employer.candidate_database_subscription_id)}?expand[]=items.data.price.product`,
          null,
          "GET",
        );
        const isActive = sub.status === "active" || sub.status === "trialing";

        // Resolve which plan by matching the Stripe product ID to our configured plans
        let resolvedPlanId = sub.metadata?.plan_id || employer.candidate_database_status;
        const matchedProductId = sub.items?.data?.[0]?.price?.product?.id || sub.items?.data?.[0]?.price?.product;
        if (matchedProductId) {
          const plans = await this._getPlans();
          const matchedPlan = plans.find((p) => p.stripe_product_id === matchedProductId);
          if (matchedPlan) resolvedPlanId = matchedPlan.id;
        }

        if (!isActive && employer.candidate_database_access) {
          await employer.update({
            candidate_database_access: false,
            candidate_database_status: "cancelled",
            candidate_database_cancelled_at: new Date(),
          });
        } else if (isActive) {
          const updates = {};
          if (!employer.candidate_database_access) updates.candidate_database_access = true;
          if (resolvedPlanId && resolvedPlanId !== employer.candidate_database_status) updates.candidate_database_status = resolvedPlanId;
          if (Object.keys(updates).length) await employer.update(updates);
        }
      } catch {
        // Stripe call failed — use cached DB state
      }
    }

    const settings = await this._getSiteSettings();

    // Check for credits expiring within 30 days
    let creditsExpiringSoon = 0;
    try {
      const { default: CreditService } = await import("./creditService.js");
      const creditService = new CreditService({ db: this.db, errorManager: this.errorManager });
      creditsExpiringSoon = await creditService.getExpiringCredits(employer.id, 30);
    } catch {}

    return {
      credits: employer.credits || 0,
      can_post_free: await canPostFreeJob(employer, this.db),
      last_free_job_at: employer.last_free_job_at,
      candidate_database_access: employer.candidate_database_access,
      candidate_database_status: employer.candidate_database_status,
      credit_costs: settings?.credit_costs || {},
      credits_expiring_soon: creditsExpiringSoon,
    };
  }

  async createCheckoutSession(planId, user, employerId) {
    const plan = await this._findPlan(planId);
    if (!plan) throw this.errorManager.getError("BAD_REQUEST", "Unknown payment plan");
    const productId = plan.stripe_product_id;
    if (!productId) throw this.errorManager.getError("BAD_REQUEST", "This plan has no Stripe Product ID configured. Ask your admin to set it up.");

    const priceData = await this._fetchDefaultPrice(productId);
    if (!priceData?.price_id) throw this.errorManager.getError("BAD_REQUEST", "Could not resolve default price for this Stripe product. Check the product in Stripe Dashboard.");

    const isCvPlan = plan.type === "cv_plan";
    const employer = isCvPlan ? null : await this.findEmployerForPayment(user.id, employerId);
    if (!employer && !isCvPlan && user.role !== "admin") {
      throw this.errorManager.getError("FORBIDDEN", "Employer profile is required before checkout");
    }

    // Prevent subscribing to a second CV database plan
    if ((plan.type === "subscription" || plan.kind === "candidate_database") && employer?.candidate_database_access && employer?.candidate_database_subscription_id) {
      throw this.errorManager.getError("BAD_REQUEST", "You already have an active CV database subscription. Use the Manage button to switch plans.");
    }

    const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const successUrl = isCvPlan
      ? `${appUrl}/dashboard/cvs?payment=success&session_id={CHECKOUT_SESSION_ID}`
      : (process.env.STRIPE_SUCCESS_URL || `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = isCvPlan
      ? `${appUrl}/dashboard/cvs?payment=cancelled`
      : (process.env.STRIPE_CANCEL_URL || `${appUrl}/dashboard?payment=cancelled`);

    const params = new URLSearchParams();
    params.set("mode", plan.type === "subscription" ? "subscription" : (plan.mode || "payment"));
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("customer_email", user.email);
    params.set("client_reference_id", user.email);
    params.set("allow_promotion_codes", "true");
    params.set("billing_address_collection", "auto");
    params.set("automatic_tax[enabled]", process.env.STRIPE_AUTOMATIC_TAX === "true" ? "true" : "false");
    params.set("metadata[plan_id]", plan.id);
    params.set("metadata[kind]", plan.type || plan.kind);
    params.set("metadata[credits]", String(plan.credits || 0));
    params.set("metadata[user_id]", user.id);
    // Store plan_id on the subscription itself so we can read it during sync
    if (plan.type === "subscription" || plan.mode === "subscription") {
      params.set("subscription_data[metadata][plan_id]", plan.id);
    }
    if (employer) {
      params.set("metadata[employer_id]", employer.id);
    }
    // Always use the product's default price from Stripe
    params.set("line_items[0][price]", priceData.price_id);
    params.set("line_items[0][quantity]", "1");

    const session = await this.stripeRequest("/checkout/sessions", params);

    await this.db.Payment.create({
      user_id: user.id,
      employer_id: employer?.id || null,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer || null,
      plan_id: plan.id,
      kind: plan.type || plan.kind || "payment",
      credits: plan.credits || 0,
      amount_total: session.amount_total || 0,
      currency: session.currency || "eur",
      mode: plan.type === "subscription" ? "subscription" : (plan.mode || "payment"),
      status: "checkout_created",
      checkout_url: session.url,
    });

    return { id: session.id, url: session.url };
  }

  async syncSession(sessionId, user) {
    const params = new URLSearchParams();
    params.set("expand[]", "line_items");
    const session = await this.stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`, null, "GET");

    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId !== user.id && user.role !== "admin") {
      throw this.errorManager.getError("FORBIDDEN", "You cannot sync this payment session");
    }

    const result = await this.fulfillCheckoutSession(session);
    const employer = await getEmployerForUser(this.db, user.id).catch(() => null);
    return {
      success: Boolean(result?.payment?.fulfilled_at),
      payment: result?.payment || null,
      employer: employer ? { id: employer.id, credits: employer.credits, candidate_database_access: employer.candidate_database_access } : null,
    };
  }

  async createPortalSession(user, employerId) {
    const employer = await this.findEmployerForPayment(user.id, employerId);
    if (!employer?.stripe_customer_id) {
      throw this.errorManager.getError("BAD_REQUEST", "No Stripe customer is linked to this employer account");
    }

    const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const params = new URLSearchParams();
    params.set("customer", employer.stripe_customer_id);
    params.set("return_url", process.env.STRIPE_PORTAL_RETURN_URL || `${appUrl}/dashboard`);
    const session = await this.stripeRequest("/billing_portal/sessions", params);
    return { url: session.url };
  }

  async list(query = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(query.limit || 50));
    params.set("expand[]", "data.customer_details");
    if (query.status) params.set("status", query.status);

    const result = await this.stripeRequest(
      `/checkout/sessions?${params.toString()}`,
      null,
      "GET",
    );

    const sessions = (result.data || []).map((session) => ({
      id: session.id,
      customer_email: session.customer_details?.email || session.customer_email || "",
      amount_total: session.amount_total || 0,
      currency: session.currency || "eur",
      status: session.status,
      payment_status: session.payment_status,
      plan_id: session.metadata?.plan_id || "",
      kind: session.metadata?.kind || "",
      employer_id: session.metadata?.employer_id || "",
      created_at: new Date(session.created * 1000).toISOString(),
    }));

    return sessions;
  }

  // ─── Private Helpers ───

  async findEmployerForPayment(userId, employerId) {
    if (employerId) {
      const employer = await this.db.Employer.findByPk(employerId);
      if (employer) return employer;
    }
    return getEmployerForUser(this.db, userId);
  }

  async fulfillCheckoutSession(session) {
    if (!session?.id || session.status !== "complete") return null;
    if (session.mode === "payment" && session.payment_status !== "paid") return null;

    const transaction = await this.db.sequelize.transaction();
    try {
      // Idempotency: lock payment record
      const existingPayment = await this.db.Payment.findOne({
        where: { stripe_session_id: session.id },
        transaction,
        lock: true,
      });
      if (existingPayment?.fulfilled_at) {
        await transaction.commit();
        return { payment: existingPayment };
      }

      const kind = session.metadata?.kind || existingPayment?.kind;
      const user_id = session.metadata?.user_id || existingPayment?.user_id;
      const employer_id = session.metadata?.employer_id || existingPayment?.employer_id;
      const employer = (kind === "cv_plan") ? null : await this.findEmployerForPayment(user_id, employer_id).catch(() => null);

      if (kind === "job_posting") {
        const job_id = session.metadata?.job_id || existingPayment?.metadata?.job_id;
        console.log(`[Fulfillment] Processing job_posting. JobId: ${job_id}, Session: ${session.id}`);
        if (job_id) {
          try {
            const job = await this.db.Job.findByPk(job_id, { transaction });
            if (job) {
              // Double-check AI moderation before approving
              let shouldApprove = true;
              try {
                const ContentModerationService = (await import("./contentModeration.js")).default;
                const moderationService = new ContentModerationService();
                const scanResult = await moderationService.scan(job.title, job.description);
                if (!scanResult.approved) {
                  shouldApprove = false;
                  await job.update({ status: "flagged", moderation_result: scanResult }, { transaction });
                  console.log(`[Fulfillment] Job ${job_id} flagged by AI`);
                } else {
                  await job.update({ moderation_result: scanResult }, { transaction });
                }
              } catch (err) {
                console.error("[Fulfillment] AI scan failed, proceeding to pending_review:", err.message);
                shouldApprove = false;
                await job.update({ status: "pending_review" }, { transaction });
              }
              if (shouldApprove) {
                const duration = job.listing_duration || 30;
                await job.update({
                  status: "approved",
                  approved_at: new Date(),
                  expires_at: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
                }, { transaction });
                console.log(`[Fulfillment] Job ${job_id} approved`);
              }

              // Activate pending addons
              await this.db.JobAddon.update(
                { status: "active" },
                { where: { job_id: job.id, status: "pending_payment" }, transaction },
              );

              // Log fulfillment in credit ledger for history visibility
              await this.db.CreditLedger.create({
                employer_id: employer?.id || job.employer_id,
                action: "debit",
                amount: 0,
                balance_after: employer?.credits || 0,
                reason: "job_posting",
                description: `Payment Complete: ${job.title}`,
                job_id: job.id,
                stripe_session_id: session.id,
              }, { transaction });
            }
          } catch (err) {
            console.error("Job fulfillment error:", err);
          }
        }
        if (employer && session.customer) {
          await employer.update({ stripe_customer_id: session.customer }, { transaction });
        }
      } else if (kind === "addon_purchase") {
        const job_id = session.metadata?.job_id || existingPayment?.metadata?.job_id;
        const addon_id = session.metadata?.addon_id || existingPayment?.metadata?.addon_id;
        console.log(`[Fulfillment] Processing addon_purchase. JobId: ${job_id}, AddonId: ${addon_id}, Session: ${session.id}`);
        if (job_id && addon_id) {
          try {
            const job = await this.db.Job.findByPk(job_id, { transaction });
            if (job) {
              await this.db.JobAddon.create({
                job_id,
                product_id: addon_id,
                credit_cost: Number(session.metadata?.credit_cost || 0),
                status: "active",
              }, { transaction });

              await this.db.CreditLedger.create({
                employer_id: employer?.id || job.employer_id,
                action: "debit",
                amount: 0,
                balance_after: employer?.credits || 0,
                reason: "addon_purchase",
                description: `Addon Purchased: ${addon_id} for "${job.title}"`,
                job_id,
                stripe_session_id: session.id,
              }, { transaction });
              console.log(`[Fulfillment] Addon ${addon_id} activated for job ${job_id}`);
            }
          } catch (err) {
            console.error("Addon fulfillment error:", err);
          }
        }
      } else if (kind === "cv_plan") {
        // CV plan purchase — update employee record
        const products = await this._getProducts();
        const product = products.find((p) => p.id === session.metadata?.plan_id);
        if (product && user_id) {
          const employee = await this.db.Employee.findOne({ where: { user_id }, transaction });
          if (employee) {
            await employee.update({
              cv_plan: product.cv_plan_tier || product.id,
              cv_plan_purchased_at: new Date(),
            }, { transaction });
            console.log(`[Fulfillment] CV plan upgraded to ${product.cv_plan_tier || product.id} for user ${user_id}`);
          }
        }
      } else {
        // Credit bundle or subscription
        const products = await this._getProducts();
        const product = products.find((p) => p.id === session.metadata?.plan_id);

        if (employer && product) {
          if (product.type === "credit_bundle") {
            const CreditService = (await import("./creditService.js")).default;
            const creditService = new CreditService({ db: this.db, errorManager: this.errorManager });
            await creditService.addCredits(employer.id, product.credits || 0, "credit_purchase", {
              stripe_session_id: session.id, transaction,
              description: `Purchased: ${product.name || product.id} (${product.credits} credits)`,
            });
          }
          if (product.type === "subscription") {
            await employer.update({
              candidate_database_access: true,
              candidate_database_status: product.id,
              candidate_database_subscription_id: session.subscription || null,
              candidate_database_started_at: new Date(),
              stripe_customer_id: session.customer || employer.stripe_customer_id,
            }, { transaction });
          }
        }
      }

      // Mark payment fulfilled
      const paymentUpdates = {
        status: "paid",
        payment_status: session.payment_status || null,
        stripe_customer_id: session.customer || null,
        stripe_subscription_id: session.subscription || null,
        amount_total: session.amount_total || 0,
        currency: session.currency || "eur",
        fulfilled_at: new Date(),
      };

      if (existingPayment) {
        await existingPayment.update(paymentUpdates, { transaction });
      } else {
        await this.db.Payment.create({
          user_id,
          employer_id: employer?.id || null,
          stripe_session_id: session.id,
          plan_id: session.metadata?.plan_id || kind,
          kind: kind || "unknown",
          credits: 0,
          mode: session.mode,
          ...paymentUpdates,
        }, { transaction });
      }

      // Generate invoice (§18)
      if (user_id && session.amount_total > 0) {
        try {
          const InvoiceService = (await import("./invoiceService.js")).default;
          const invoiceService = new InvoiceService({ db: this.db });
          const kindLabels = { job_posting: "Job Listing", credit_bundle: "Credit Bundle", subscription: "CV Database Subscription", cv_plan: "CV Plan", addon_purchase: "Job Addon" };
          await invoiceService.createInvoice({
            user_id,
            amount: session.amount_total,
            description: kindLabels[kind] || kind || "Payment",
            stripe_session_id: session.id,
            kind,
          });
        } catch (invErr) {
          console.error("[Invoice] Failed to create invoice:", invErr.message);
        }
      }

      await transaction.commit();
      return { payment: existingPayment || paymentUpdates };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async stripeRequest(path, params, method = "POST") {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw this.errorManager.getError("STRIPE_NOT_CONFIGURED");

    const options = {
      method,
      headers: { Authorization: `Bearer ${secretKey}` },
    };

    if (params) {
      options.headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = params.toString();
    }

    const response = await fetch(`${STRIPE_API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || "Stripe request failed");
      error.status = response.status;
      throw error;
    }
    return data;
  }

}

export default PaymentService;
