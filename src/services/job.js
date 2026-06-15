import * as cheerio from "cheerio";
import PaymentService, { canPostFreeJob } from "./payment.js";
import ProductService from "./productService.js";
import CreditService from "./creditService.js";
import ViewService from "./viewService.js";
import ContentModerationService from "./contentModeration.js";
import { getEmployerForUser } from "../utils/employerLookup.js";
import crypto from "crypto";

function generateSlug(title, location) {
  const base = `${title || ""} ${location || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

function transformJob(job) {
  const json = job.toJSON ? job.toJSON() : { ...job };
  
  // Derive addon flags from job_addons table
  const addonList = Array.isArray(json.addons) ? json.addons : [];
  const activeAddons = addonList.filter((a) => a.status === "active");
  const addonIds = activeAddons.map((a) => a.product_id);
  
  json.is_featured = addonIds.includes("addon_featured");
  json.is_highlighted = addonIds.includes("addon_highlight");
  json.is_imported = addonIds.includes("addon_import");
  json.is_duplicate = addonIds.includes("addon_duplicate");
  json.is_urgent = addonIds.includes("addon_urgent");
  
  json.active_addons = activeAddons.map((a) => ({
    id: a.product_id,
    credit_cost: a.credit_cost,
    status: a.status
  }));
  
  json.is_expired = json.expires_at ? new Date(json.expires_at) < new Date() : false;
  json.views_count = json.views_count || 0;

  // Generate employer slug for public profile link
  if (json.company_name || json.employer?.company_name) {
    json.employer_slug = (json.company_name || json.employer?.company_name)
      .toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  return json;
}

class JobService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
    this.paymentService = new PaymentService(context);
    this.productService = new ProductService(context);
    this.creditService = new CreditService(context);
    this.viewService = new ViewService(context.db);
  }

  async list(query = {}) {
    const { Op } = this.db.Sequelize;
    const where = { status: { [Op.ne]: "deleted" } };
    if (query.status) {
      where.status = query.status;
      // For approved (public) listings, exclude expired jobs
      if (query.status === "approved") {
        where[Op.or] = [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } },
        ];
      }
    }
    if (query.employer_id) where.employer_id = query.employer_id;
    if (query.category) where.category = query.category;
    if (query.location) where.location = query.location;
    if (query.job_type) where.job_type = query.job_type;
    if (query.created_by) where.created_by = query.created_by;

    // Badge filters — filter by active job_addons
    const badgeAddonIds = [];
    if (query.is_featured === "true") badgeAddonIds.push("addon_featured");
    if (query.is_highlighted === "true") badgeAddonIds.push("addon_highlight");
    if (query.is_urgent === "true") badgeAddonIds.push("addon_urgent");

    // Keyword search across title, description, companyName
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: kw } },
        { description: { [Op.iLike]: kw } },
        { company_name: { [Op.iLike]: kw } },
      ];
    }

    // Location search
    if (query.locationSearch) {
      where.location = { [Op.iLike]: `%${query.locationSearch}%` };
    }

    // Work type filter (on-site, hybrid, remote)
    if (query.work_type) {
      where.remote_work_mode = query.work_type;
    }

    // Salary filter
    if (query.salary_min) {
      where.salary_max = { ...(where.salary_max || {}), [Op.gte]: Number(query.salary_min) };
    }
    if (query.salary_max) {
      where.salary_min = { ...(where.salary_min || {}), [Op.lte]: Number(query.salary_max) };
    }

    // Date posted filter
    if (query.date_posted) {
      const now = new Date();
      const daysMap = { "24h": 1, "7d": 7, "30d": 30 };
      const days = daysMap[query.date_posted];
      if (days) {
        where.created_at = { [Op.gte]: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
      }
    }

    let order;
    if (query.order === "created_at") {
      order = [["created_at", "ASC"]];
    } else if (query.status === "approved") {
      // Ranking: Highlighted > Paid > Free, then by date
      order = [
        [this.db.Sequelize.literal(`(SELECT COUNT(*) FROM job_addons ja WHERE ja.job_id = "Job".id AND ja.product_id = 'addon_highlight' AND ja.status = 'active')`), "DESC"],
        ["listing_type", "DESC"],
        ["created_at", "DESC"],
      ];
    } else {
      order = [["created_at", "DESC"]];
    }

    const addonInclude = badgeAddonIds.length
      ? { model: this.db.JobAddon, as: "addons", where: { product_id: { [Op.in]: badgeAddonIds }, status: "active" }, required: true }
      : { model: this.db.JobAddon, as: "addons" };

    const include = [
      { model: this.db.Employer, as: "employer", attributes: ["id", "company_name", "user_id"] },
      addonInclude,
    ];
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const { count, rows } = await this.db.Job.findAndCountAll({
      where, order, include, limit: pageSize, offset, distinct: true,
    });

    // Real-time sync for unpaid jobs on this page
    const syncedRows = await Promise.all(
      rows.map(async (job) => {
        if (job.status === "unpaid" && job.payment_stripe_id) {
          try {
            await this._syncJobPaymentStatus(job);
            await job.reload();
          } catch (err) {
            console.error(`[StripeSync] Job ${job.id} sync failed:`, err.message);
          }
        }
        return job;
      }),
    );

    return {
      items: syncedRows.map(transformJob),
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  async getById(id, user = null, ip = null) {
    // Support lookup by UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const findOpts = {
      include: [
        { model: this.db.Employer, as: "employer" },
        { model: this.db.JobAddon, as: "addons" },
      ],
    };
    const job = isUUID
      ? await this.db.Job.findByPk(id, findOpts)
      : await this.db.Job.findOne({ where: { slug: id }, ...findOpts });
    if (!job || job.status === "deleted") throw this.errorManager.getError("JOB_NOT_FOUND");

    // Real-time sync if viewed by employer/admin and still unpaid
    if (job.status === "unpaid" && job.payment_stripe_id && user && (job.created_by === user.email || user.role === "admin")) {
      try {
        await this._syncJobPaymentStatus(job);
        await job.reload();
      } catch (err) {
        console.error(`[StripeSync] Job ${job.id} sync failed:`, err.message);
      }
    }

    // Non-approved jobs only visible to the creator or admins
    if (job.status !== "approved") {
      const isOwner = user && job.created_by === user.email;
      const isAdmin = user && user.role === "admin";
      if (!isOwner && !isAdmin) throw this.errorManager.getError("JOB_NOT_FOUND");
    }

    // Track view for approved public jobs (non-owner, non-admin)
    if (ip && job.status === "approved") {
      const isOwner = user && job.created_by === user.email;
      if (!isOwner) {
        this.viewService.trackView(id, ip).catch(() => {});
      }
    }

    return transformJob(job);
  }

  async create(data, user) {
    data.created_by = user.email;

    // Clean up empty/invalid date strings
    const dateFields = ["expires_at", "approved_at", "job_start_date"];
    for (const field of dateFields) {
      if (data[field] === "" || data[field] === "Invalid date") {
        data[field] = null;
      }
    }

    const listing_type = data.listing_type || "paid";
    const selectedAddons = Array.isArray(data.addons) ? data.addons.filter((id) => typeof id === "string" && id.startsWith("addon_")) : [];

    // Find employer
    const employer = await getEmployerForUser(this.db, user.id);

    if (!employer && user.role !== "admin") {
      throw this.errorManager.getError("FORBIDDEN", "Employer profile required to post jobs");
    }

    // Get listing product for duration config
    const listing = await this.productService.getListingProduct();
    if (!listing && listing_type === "paid") {
      throw this.errorManager.getError("BAD_REQUEST", "No listing product configured. Ask admin to set up products.");
    }

    let costResult = null;

    if (listing_type === "free") {
      if (employer && !(await canPostFreeJob(employer, this.db))) {
        throw this.errorManager.getError("BAD_REQUEST", "You already have an active free listing. Purchase credits for additional listings.");
      }
      data.listing_duration = 14;
      data.credits_charged = 0;
      if (data.status === "approved") {
        data.approved_at = new Date();
        data.expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
      if (employer) await employer.update({ last_free_job_at: new Date() });
    } else {
      // Calculate cost from product catalog
      costResult = await this.productService.calculateJobCost(selectedAddons);
      const credit_cost = costResult.total;
      const duration = listing.duration || 30;

      // Admin posts without credits
      if (employer && user.role !== "admin") {
        // Build description for ledger
        const addonNames = costResult.addons.map((a) => a.name).join(", ");
        const deductDescription = `Job: ${data.title || "Untitled"}${addonNames ? ` + ${addonNames}` : ""}`;

        // Atomic credit deduction with row lock
        const deductResult = await this.creditService.deductCredits(
          employer.id, credit_cost, "job_posting",
          { description: deductDescription },
        );

        if (!deductResult.success) {
          // Insufficient credits — create job as 'unpaid' then redirect to checkout
          data.status = "unpaid";
          data.listing_duration = duration;
          data.employer_id = employer.id;
          data.company_name = data.company_name || employer.company_name;
          
          const job = await this.db.Job.create(data);

          // Create pending addon records
          if (costResult?.addons?.length) {
            await Promise.all(
              costResult.addons.map((addon) =>
                this.db.JobAddon.create({
                  job_id: job.id,
                  product_id: addon.id,
                  credit_cost: addon.credit_cost,
                  status: "pending_payment",
                }),
              ),
            );
          }

          const allProducts = await this.productService.getProducts();
          const addonProducts = allProducts.filter(
            (p) => p.type === "addon" && selectedAddons.includes(p.id),
          );
          return this._createJobCheckout(job.id, credit_cost, listing, addonProducts, user, employer);
        }
        data.credits_charged = credit_cost;
        data.credit_log_id = deductResult.logId;
      }

      data.listing_duration = duration;
      if (!data.credits_charged) data.credits_charged = credit_cost;
      if (data.status === "approved") {
        data.approved_at = new Date();
        data.expires_at = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      }
    }

    data.listing_type = listing_type;
    if (employer) {
      data.employer_id = employer.id;
      data.company_name = data.company_name || employer.company_name;
    }

    // Generate SEO slug
    data.slug = generateSlug(data.title, data.location);

    const job = await this.db.Job.create(data);

    // Double-check AI moderation on backend before approving (never trust frontend alone)
    if (job.status === "pending_review") {
      try {
        const moderationService = new ContentModerationService();
        const scanResult = await moderationService.scan(job.title, job.description);
        if (scanResult.approved) {
          await job.update({
            status: "approved",
            moderation_result: scanResult,
            approved_at: new Date(),
            expires_at: new Date(Date.now() + (data.listing_duration || 30) * 24 * 60 * 60 * 1000),
          });
          try {
            const { notify } = await import("./notifier.js");
            const ownerUser = await this.db.User.findOne({ where: { email: job.created_by } });
            if (ownerUser) {
              notify("JOB_APPROVED", { employer: { email: ownerUser.email, first_name: ownerUser.first_name }, job: { id: job.id, title: job.title } });
              await this.db.Notification.create({ user_id: ownerUser.id, type: "job", title: "Job Approved", message: `Your listing "${job.title}" is now live.`, link: `/jobs/${job.id}` });
            }
          } catch {}
        } else {
          await job.update({ status: "flagged", moderation_result: scanResult });
        }
      } catch (err) {
        console.error("[Moderation] Backend scan failed:", err.message);
        // On failure, stays pending_review for manual admin review
      }
    }

    // Update CreditLedger with job_id if credits were deducted
    if (data.credit_log_id) {
      await this.db.CreditLedger.update(
        { job_id: job.id },
        { where: { id: data.credit_log_id } }
      );
    }

    // For unpaid jobs, log the pending state in ledger so it shows in history
    if (job.status === "unpaid") {
      await this.db.CreditLedger.create({
        employer_id: employer.id,
        action: "debit",
        amount: 0,
        balance_after: employer.credits || 0,
        reason: "job_posting",
        description: `Payment Pending: ${job.title}`,
        job_id: job.id,
      });
    }

    // Create addon records in job_addons table
    if (costResult?.addons?.length) {
      await Promise.all(
        costResult.addons.map((addon) =>
          this.db.JobAddon.create({
            job_id: job.id,
            product_id: addon.id,
            credit_cost: addon.credit_cost,
            status: "active",
          }),
        ),
      );
    }

    // Re-fetch with addons included for the response
    const fullJob = await this.db.Job.findByPk(job.id, {
      include: [
        { model: this.db.Employer, as: "employer", attributes: ["id", "company_name", "user_id"] },
        { model: this.db.JobAddon, as: "addons" },
      ],
    });

    return transformJob(fullJob);
  }

  async _createJobCheckout(job_id, credit_cost, listing, addonProducts, user, employer) {
    const job = await this.db.Job.findByPk(job_id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");

    // Resolve Stripe prices for listing + each addon
    const lineItems = [];
    const listingPrice = listing.stripe_product_id
      ? await this.paymentService._fetchDefaultPrice(listing.stripe_product_id)
      : null;

    if (listingPrice?.price_id) {
      lineItems.push({ price: listingPrice.price_id, quantity: 1, recurring: !!listingPrice.recurring });
    } else {
      lineItems.push({
        price_data: {
          currency: "eur",
          unit_amount: Math.round((listing.credit_cost || 1) * 1000),
          product_data: { name: `Job Listing: ${job.title || "New Job"}` },
        },
        quantity: 1,
      });
    }

    for (const addon of addonProducts) {
      const addonPrice = addon.stripe_product_id
        ? await this.paymentService._fetchDefaultPrice(addon.stripe_product_id)
        : null;

      if (addonPrice?.price_id) {
        lineItems.push({ price: addonPrice.price_id, quantity: 1, recurring: !!addonPrice.recurring });
      } else {
        lineItems.push({
          price_data: {
            currency: "eur",
            unit_amount: Math.round((addon.credit_cost || 0) * 1000),
            product_data: { name: addon.name },
          },
          quantity: 1,
        });
      }
    }

    // Check if any product has a recurring price (requires subscription mode)
    let sessionMode = "payment";
    for (const item of lineItems) {
      if (item.recurring) {
        sessionMode = "subscription";
        break;
      }
    }

    const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const checkoutParams = new URLSearchParams();
    checkoutParams.set("mode", sessionMode);
    checkoutParams.set("success_url", `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    checkoutParams.set("cancel_url", `${appUrl}/dashboard?payment=cancelled`);
    checkoutParams.set("customer_email", user.email);
    checkoutParams.set("client_reference_id", user.email);
    checkoutParams.set("metadata[kind]", "job_posting");
    checkoutParams.set("metadata[user_id]", user.id);
    checkoutParams.set("metadata[employer_id]", employer.id);
    checkoutParams.set("metadata[job_id]", job_id);
    checkoutParams.set("metadata[credit_cost]", String(credit_cost));

    // Add each line item to checkout params
    lineItems.forEach((item, i) => {
      if (item.price) {
        checkoutParams.set(`line_items[${i}][price]`, item.price);
        checkoutParams.set(`line_items[${i}][quantity]`, "1");
      } else {
        checkoutParams.set(`line_items[${i}][price_data][currency]`, item.price_data.currency);
        checkoutParams.set(`line_items[${i}][price_data][unit_amount]`, String(item.price_data.unit_amount));
        checkoutParams.set(`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name);
        checkoutParams.set(`line_items[${i}][quantity]`, "1");
      }
    });

    const session = await this.paymentService.stripeRequest("/checkout/sessions", checkoutParams);

    // Update job with Stripe session ID
    await job.update({ payment_stripe_id: session.id });

    await this.db.Payment.create({
      user_id: user.id,
      employer_id: employer.id,
      stripe_session_id: session.id,
      plan_id: "job_checkout",
      kind: "job_posting",
      credits: 0,
      amount_total: session.amount_total || 0,
      currency: "eur",
      mode: "payment",
      status: "checkout_created",
      checkout_url: session.url,
      metadata: {
        job_id: job_id,
        addon_products: addonProducts.map((a) => ({ id: a.id, name: a.name, credit_cost: a.credit_cost })),
      },
    });

    return { needs_checkout: true, checkout_url: session.url, credit_cost, job_id };
  }

  async checkout(id, user) {
    const job = await this.db.Job.findByPk(id, {
      include: [{ model: this.db.JobAddon, as: "addons" }],
    });
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (job.status !== "unpaid") throw this.errorManager.getError("BAD_REQUEST", "Job is not in unpaid status.");

    const employer = await getEmployerForUser(this.db, user.id);
    if (!employer) throw this.errorManager.getError("FORBIDDEN", "Employer profile required");

    const listing = await this.productService.getListingProduct();
    const selectedAddons = job.addons.map((a) => a.product_id);
    const costResult = await this.productService.calculateJobCost(selectedAddons);
    const allProducts = await this.productService.getProducts();
    const addonProducts = allProducts.filter((p) => selectedAddons.includes(p.id));

    return this._createJobCheckout(job.id, costResult.total, listing, addonProducts, user, employer);
  }

  async duplicate(job_id, user) {
    const original = await this.db.Job.findByPk(job_id);
    if (!original) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (original.status === "flagged") throw this.errorManager.getError("BAD_REQUEST", "Flagged listings cannot be duplicated. Resolve compliance issues first.");

    // Copy all fields except id, timestamps, status
    const jobData = original.toJSON();
    delete jobData.id;
    delete jobData.created_at;
    delete jobData.updated_at;

    return this.create({
      ...jobData,
      status: "pending_review",
      is_duplicate: true,
      duplicate_of: job_id,
      listing_type: "paid",
      addons: ["addon_duplicate"],
    }, user);
  }

  async update(id, updates, user = null) {
    const job = await this.db.Job.findByPk(id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");

    // Flagged listings are locked — only resubmit endpoint can modify them
    // Admin can override via status change
    const isAdmin = user && user.role === "admin";
    if (job.status === "flagged" && !isAdmin) {
      throw this.errorManager.getError("BAD_REQUEST", "This listing has been flagged for compliance issues. Use the Revise & Resubmit option to make changes.");
    }

    const oldStatus = job.status;

    // Clean up empty/invalid date strings
    const dateFields = ["expires_at", "approved_at", "job_start_date"];
    for (const field of dateFields) {
      if (updates[field] === "" || updates[field] === "Invalid date") {
        updates[field] = null;
      }
    }

    // If title or description changed, re-run AI moderation
    if (updates.title || updates.description) {
      try {
        const moderationService = new ContentModerationService();
        const scanResult = await moderationService.scan(
          updates.title || job.title,
          updates.description || job.description,
        );
        updates.moderation_result = scanResult;
        if (!scanResult.approved) {
          updates.status = "flagged";
        } else if (job.status === "approved") {
          // Was approved, scan passed — stay approved
        } else {
          // Was draft/pending — auto-approve
          updates.status = "approved";
          updates.approved_at = new Date();
          updates.expires_at = new Date(Date.now() + (job.listing_duration || 30) * 24 * 60 * 60 * 1000);
        }
      } catch (err) {
        console.error("[Moderation] Update scan failed:", err.message);
      }
    }

    // If admin is manually changing to approved, set the expiration date
    if (updates.status === "approved" && oldStatus !== "approved" && !updates.approved_at) {
      const duration = updates.listing_duration || job.listing_duration || 30;
      updates.approved_at = new Date();
      updates.expires_at = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }

    await job.update(updates);

    // Notify employer on status change
    if (updates.status && updates.status !== oldStatus && job.created_by) {
      const { notify } = await import("./notifier.js");
      const empUser = await this.db.User.findOne({ where: { email: job.created_by } });
      if (empUser) {
        // Email notification
        if (updates.status === "approved") {
          notify("JOB_APPROVED", { employer: { email: empUser.email, first_name: empUser.first_name }, job: { id: job.id, title: job.title } });
        } else if (updates.status === "rejected") {
          notify("JOB_REJECTED", { employer: { email: empUser.email, first_name: empUser.first_name }, job: { title: job.title } });
        }

        // In-app notification
        const statusMessages = {
          approved: `Your job "${job.title}" has been approved and is now live.`,
          rejected: `Your job "${job.title}" has been rejected. Please review and resubmit.`,
          archived: `Your job "${job.title}" has been archived.`,
        };
        const message = statusMessages[updates.status];
        if (message) {
          const { default: NotificationService } = await import("./notificationService.js");
          const notificationService = new NotificationService({ db: this.db, errorManager: this.errorManager });
          await notificationService.create({
            user_id: empUser.id,
            title: `Job ${updates.status === "approved" ? "Approved" : updates.status === "rejected" ? "Rejected" : "Updated"}`,
            message,
            type: "job",
            link: updates.status === "approved" ? `/jobs/${job.id}` : `/dashboard`,
          });
        }
      }
    }

    // Sync addons if provided
    if (Array.isArray(updates.addons)) {
      const products = await this.productService.getProducts();
      const validAddons = products.filter((p) => p.type === "addon" && updates.addons.includes(p.id));
      const currentAddonIds = updates.addons;

      // Remove addons not in the new list
      await this.db.JobAddon.destroy({ where: { job_id: id, product_id: { [this.db.Sequelize.Op.notIn]: currentAddonIds.length ? currentAddonIds : ["_none_"] } } });

      // Add new addons that don't exist yet
      for (const addon of validAddons) {
        await this.db.JobAddon.findOrCreate({
          where: { job_id: id, product_id: addon.id },
          defaults: { job_id: id, product_id: addon.id, credit_cost: addon.credit_cost || 0, status: "active" },
        });
      }

      // If addons list is empty, remove all
      if (currentAddonIds.length === 0) {
        await this.db.JobAddon.destroy({ where: { job_id: id } });
      }
    }

    // Re-fetch with addons
    const fullJob = await this.db.Job.findByPk(id, {
      include: [
        { model: this.db.Employer, as: "employer", attributes: ["id", "company_name", "user_id"] },
        { model: this.db.JobAddon, as: "addons" },
      ],
    });
    return transformJob(fullJob);
  }

  async activateAddon(job_id, addon_id, user) {
    const job = await this.db.Job.findByPk(job_id, {
      include: [{ model: this.db.JobAddon, as: "addons" }],
    });
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (job.status === "flagged") throw this.errorManager.getError("BAD_REQUEST", "Flagged listings cannot be modified. Resolve compliance issues first.");
    const allowedStatuses = ["approved", "pending_review", "draft"];
    if (!allowedStatuses.includes(job.status)) {
      throw this.errorManager.getError("BAD_REQUEST", "Addons can only be added to active or pending listings.");
    }

    // Check if addon already active
    const existing = job.addons?.find((a) => a.product_id === addon_id && a.status === "active");
    if (existing) throw this.errorManager.getError("BAD_REQUEST", "This addon is already active on this job.");

    // Get the addon product
    const product = await this.productService.getProduct(addon_id);
    if (!product || product.type !== "addon") throw this.errorManager.getError("BAD_REQUEST", "Invalid addon.");

    // Exclude import and duplicate — those are only for new postings
    if (addon_id === "addon_import" || addon_id === "addon_duplicate") {
      throw this.errorManager.getError("BAD_REQUEST", "This addon can only be applied during job creation.");
    }

    const credit_cost = product.credit_cost || 0;

    // Find employer
    const employer = await getEmployerForUser(this.db, user.id);
    if (!employer) throw this.errorManager.getError("FORBIDDEN", "Employer profile required.");

    // Role check: Only owner/admin can purchase addons (as it costs credits/money)
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.db, user.id, employer.id, ["owner", "admin"], this.errorManager);

    // Deduct credits
    if (credit_cost > 0) {
      const result = await this.creditService.deductCredits(employer.id, credit_cost, "addon_purchase", {
        description: `Addon: ${product.name} for "${job.title}"`,
        job_id: job.id,
      });

      if (!result.success) {
        // Insufficient credits — trigger checkout
        return this._createAddonCheckout(job.id, addon_id, credit_cost, product, user, employer);
      }
    }

    // Create addon record directly if credits deducted successfully
    await this.db.JobAddon.create({
      job_id: job.id,
      product_id: addon_id,
      credit_cost,
      status: "active",
    });

    // Re-fetch
    const fullJob = await this.db.Job.findByPk(job_id, {
      include: [
        { model: this.db.Employer, as: "employer", attributes: ["id", "company_name", "user_id"] },
        { model: this.db.JobAddon, as: "addons" },
      ],
    });
    return transformJob(fullJob);
  }

  async _createAddonCheckout(job_id, addon_id, credit_cost, product, user, employer) {
    const job = await this.db.Job.findByPk(job_id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");

    const priceData = await this.paymentService._fetchDefaultPrice(product.stripe_product_id);
    console.log(`[AddonCheckout] Product: ${product.id}, Stripe: ${product.stripe_product_id}, Price:`, JSON.stringify(priceData));
    if (!priceData?.price_id) {
      throw this.errorManager.getError("BAD_REQUEST", "This addon has no Stripe price configured.");
    }

    const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const checkoutParams = new URLSearchParams();
    checkoutParams.set("mode", "payment");
    checkoutParams.set("success_url", `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    checkoutParams.set("cancel_url", `${appUrl}/dashboard?payment=cancelled`);
    checkoutParams.set("customer_email", user.email);
    checkoutParams.set("client_reference_id", user.email);
    checkoutParams.set("metadata[kind]", "addon_purchase");
    checkoutParams.set("metadata[user_id]", user.id);
    checkoutParams.set("metadata[employer_id]", employer.id);
    checkoutParams.set("metadata[job_id]", job_id);
    checkoutParams.set("metadata[addon_id]", addon_id);
    checkoutParams.set("metadata[credit_cost]", String(credit_cost));

    checkoutParams.set("line_items[0][price]", priceData.price_id);
    checkoutParams.set("line_items[0][quantity]", "1");

    const session = await this.paymentService.stripeRequest("/checkout/sessions", checkoutParams);

    await this.db.Payment.create({
      user_id: user.id,
      employer_id: employer.id,
      stripe_session_id: session.id,
      plan_id: "addon_checkout",
      kind: "addon_purchase",
      credits: 0,
      amount_total: session.amount_total || 0,
      currency: "eur",
      mode: "payment",
      status: "checkout_created",
      checkout_url: session.url,
      metadata: {
        job_id,
        addon_id: addon_id,
        credit_cost,
      },
    });

    return { needs_checkout: true, checkout_url: session.url, credit_cost, job_id, addon_id };
  }

  async renew(id, user) {
    const job = await this.db.Job.findByPk(id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (job.status === "flagged") throw this.errorManager.getError("BAD_REQUEST", "Flagged listings cannot be renewed. Resolve compliance issues first.");
    if (!job.expires_at) {
      throw this.errorManager.getError("BAD_REQUEST", "This job has no expiry date set.");
    }
    if (new Date(job.expires_at) < new Date()) {
      throw this.errorManager.getError("BAD_REQUEST", "Expired listings cannot be renewed. Create a new listing instead.");
    }
    if (job.status !== "approved") {
      throw this.errorManager.getError("BAD_REQUEST", "Only active listings can be renewed.");
    }

    const employer = await getEmployerForUser(this.db, user.id);
    if (!employer) throw this.errorManager.getError("FORBIDDEN", "Employer profile required.");

    // Role check: Only owner/admin can renew (as it costs credits/money)
    const { requireRole } = await import("../utils/employerLookup.js");
    await requireRole(this.db, user.id, employer.id, ["owner", "admin"], this.errorManager);

    const listing = await this.productService.getListingProduct();
    if (!listing) throw this.errorManager.getError("BAD_REQUEST", "No listing product configured.");

    const credit_cost = listing.credit_cost || 1;

    const result = await this.creditService.deductCredits(employer.id, credit_cost, "renew_listing", {
      description: `Renew: ${job.title}`,
      job_id: job.id,
    });

    if (!result.success) {
      throw this.errorManager.getError("BAD_REQUEST", `Insufficient credits. Need ${credit_cost}, have ${result.balance}.`);
    }

    const duration = listing.duration || 30;
    const currentExpiry = new Date(job.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + duration * 24 * 60 * 60 * 1000);
    await job.update({
      listing_duration: (job.listing_duration || 0) + duration,
      expires_at: newExpiry,
    });

    return transformJob(job);
  }

  async remove(id) {
    const job = await this.db.Job.findByPk(id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (job.status === "flagged") throw this.errorManager.getError("BAD_REQUEST", "Flagged listings cannot be deleted. Use Revise & Resubmit to resolve compliance issues first.");
    await job.update({ status: "deleted" });
    return { success: true };
  }

  async scrapeJobsIreland(ref) {
    const sourceUrl = `https://jobsireland.ie/en-US/job-Details?id=${encodeURIComponent(ref)}`;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IE,en;q=0.9",
      "Referer": "https://jobsireland.ie/en-US/browse-jobs",
    };

    let html;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      try {
        const response = await fetch(sourceUrl, { method: "GET", redirect: "follow", signal: controller.signal, headers });
        if (!response.ok) throw this.errorManager.getError("NOT_FOUND", `JobsIreland job not found for reference ${ref}`);
        html = await response.text();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (error?.name === "AbortError") throw this.errorManager.getError("INTERNAL_ERROR", "JobsIreland is not responding. Please try again.");
      throw error;
    }

    if (!html || html.length < 500) throw this.errorManager.getError("NOT_FOUND", "Job not found. The reference may be invalid.");
    if (html.includes("no-job-avilable") || html.includes("This vacancy is no longer available")) {
      throw this.errorManager.getError("NOT_FOUND", `Job reference ${ref} is no longer available on JobsIreland.`);
    }

    const data = this._extractJobsIrelandData(html, ref, sourceUrl);
    if (!data) throw this.errorManager.getError("BAD_REQUEST", "Could not extract job details from JobsIreland page");
    return { success: true, data, sourceUrl };
  }

  _extractJobsIrelandData(html, ref, sourceUrl) {
    const $ = cheerio.load(html);
    const clean = (v) => (v || "").replace(/\s+/g, " ").trim();

    const raw = {};

    // Title
    raw.title = clean($(".job-details h3").first().text());
    if (!raw.title) {
      const modal = clean($(".modaljobheader").first().text());
      raw.title = modal.replace(/^#[A-Z]+-\d+\s*-\s*/i, "");
    }

    // Detail list — icon alt text identifies each field
    $(".job-detail_list li, .job-details ul li").each((_, li) => {
      const $li = $(li);
      const iconAlt = $li.find(".icon-images img, img").first().attr("alt") || "";
      const $vals = $li.find("div:not(.icon-images)");
      const valueText = clean($vals.first().text()) || clean($li.text());
      const linkText = clean($li.find("a").first().text());

      if (/Image for Employer/i.test(iconAlt)) {
        raw.company_name = valueText || null;
      } else if (/Image for Job Ref/i.test(iconAlt)) {
        raw.internal_ref = valueText;
      } else if (/Image for Location/i.test(iconAlt)) {
        raw.raw_location = valueText;
      } else if (/Image Position/i.test(iconAlt)) {
        const m = valueText.match(/positions?\s*:?\s*(\d+)/i);
        raw.positions_count = m ? parseInt(m[1], 10) : 1;
      } else if (/Image Part Time|Image Full Time/i.test(iconAlt)) {
        raw.raw_job_type = valueText;
      } else if (/Image Hours/i.test(iconAlt)) {
        const m = valueText.match(/(\d+\.?\d*)\s*hours?/i);
        raw.hours_per_week = m ? parseFloat(m[1]) : null;
      } else if (/Image for Euro/i.test(iconAlt)) {
        raw.raw_salary = valueText || linkText;
      } else if (/Image for Published/i.test(iconAlt)) {
        raw.published_text = valueText;
      } else if (/Image for Closing/i.test(iconAlt)) {
        raw.closing_text = valueText;
      }
    });

    // Description
    const descPre = clean($("pre.ng-binding").text()) || clean($(".job-description pre").first().text());
    const descParagraphs = [];
    $(".role-description p, .job-description p").each((_, p) => {
      const t = clean($(p).text());
      if (t) descParagraphs.push(t);
    });
    raw.description = descPre || descParagraphs.join("\n\n") || clean($(".job-description").first().text()) || null;

    // Career level
    const careerText = clean($(".experiences li").first().text());
    if (careerText) raw.career_level = this._mapCareerLevel(careerText);

    // Sector — #LbNace is populated by JS so it's empty in static HTML.
    // Read the NACE code from the hidden input and map it.
    const naceRaw = ($("#NaceCode").val() || $("#NaceCode").attr("value") || "").trim();
    const naceCode = naceRaw.charAt(0).toUpperCase();
    // NACE code → { sector label, category value }
    const NACE_MAP = {
      A: { sector: "Agriculture, Forestry and Fishing", category: "agriculture_forestry_fishing" },
      B: { sector: "Mining and Quarrying", category: "mining_quarrying" },
      C: { sector: "Manufacturing", category: "manufacturing" },
      D: { sector: "Electricity, Gas, Steam and Air Conditioning Supply", category: "electricity_gas" },
      E: { sector: "Water Supply; Sewerage, Waste Management", category: "water_waste" },
      F: { sector: "Construction", category: "construction" },
      G: { sector: "Wholesale and Retail Trade", category: "wholesale_retail" },
      H: { sector: "Transportation and Storage", category: "transportation_storage" },
      I: { sector: "Accommodation and Food Service", category: "accommodation_food" },
      J: { sector: "Information and Communication", category: "information_communication" },
      K: { sector: "Financial and Insurance", category: "financial_insurance" },
      L: { sector: "Real Estate", category: "real_estate" },
      M: { sector: "Professional, Scientific and Technical", category: "professional_scientific" },
      N: { sector: "Administrative and Support Service", category: "admin_support" },
      O: { sector: "Public Administration and Defence", category: "public_admin_defence" },
      P: { sector: "Education", category: "education" },
      Q: { sector: "Human Health and Social Work", category: "health_social" },
      R: { sector: "Arts, Entertainment and Recreation", category: "arts_entertainment" },
      S: { sector: "Other Service Activities", category: "other_services" },
      T: { sector: "Other Service Activities", category: "other_services" },
      U: { sector: "Extraterritorial Organisations", category: "extraterritorial" },
    };
    if (naceCode && NACE_MAP[naceCode]) {
      raw.sector = NACE_MAP[naceCode].sector;
      raw.category = NACE_MAP[naceCode].category;
    }
    // Fallback: try reading #LbNace text (in case JS already ran)
    if (!raw.sector) {
      const sectorName = clean($("#LbNace").text());
      if (sectorName) raw.sector = sectorName;
    }
    // Fallback: extract "Sector: xxx" from page text
    if (!raw.sector) {
      const fullText = clean($("body").text());
      const sectorMatch = fullText.match(/Sector:\s*([a-z][a-z ,;()&]+?)(?:\s*Career|$)/i);
      if (sectorMatch) {
        const sectorText = sectorMatch[1].trim().toLowerCase();
        raw.sector = sectorText;
        // Match to NACE category
        for (const entry of Object.values(NACE_MAP)) {
          if (entry.sector.toLowerCase() === sectorText || sectorText.includes(entry.sector.toLowerCase().split(",")[0])) {
            raw.sector = entry.sector;
            raw.category = entry.category;
            break;
          }
        }
      }
    }

    if (!raw.title && !raw.description) return null;

    // ── Normalise into our field structure ──
    return this._normaliseScrapedJob(raw, ref, sourceUrl);
  }

  _normaliseScrapedJob(raw, ref, sourceUrl) {
    // Parse salary
    const salary = this._parseSalary(raw.raw_salary);

    // Parse location — extract county for dropdown, keep full address
    const locParts = (raw.raw_location || "Ireland").split(",").map((s) => s.trim()).filter(Boolean);
    // Find county: "Co. Kerry" → "Kerry", or second part if no "Co." prefix
    const countyPart = locParts.find((p) => /^Co\.?\s/i.test(p));
    const county = countyPart ? countyPart.replace(/^Co\.?\s*/i, "").trim() : null;
    // City/town is typically the first part
    const city = locParts[0] || null;
    // Build a location value that matches dropdown options: "City, County" or just "County"
    const locationForDropdown = county || city || raw.raw_location || "Ireland";

    // Job type
    const rawType = (raw.raw_job_type || "").toLowerCase();
    let job_type = "full_time";
    if (rawType.includes("part-time") || rawType.includes("part time")) job_type = "part_time";
    else if (rawType.includes("contract")) job_type = "contract";
    else if (rawType.includes("temporary") || rawType.includes("temp")) job_type = "temporary";
    else if (rawType.includes("intern")) job_type = "internship";
    else if (rawType.includes("community employment")) job_type = "contract";
    else if (rawType.includes("paid position")) job_type = "full_time";

    // Short description
    let short_description = "";
    if (raw.description) {
      short_description = raw.description.substring(0, 280).replace(/\s+\S*$/, "");
      if (raw.description.length > 280) short_description += "...";
    }

    return {
      title: raw.title || `Job ${ref}`,
      description: raw.description || null,
      short_description,
      company_name: raw.company_name || null,
      location: locationForDropdown,
      location_full: raw.raw_location || null,
      country: "Ireland",
      job_type,
      hours_per_week: raw.hours_per_week || null,
      positions_count: raw.positions_count || 1,
      career_level: raw.career_level || null,
      sector: raw.sector || null,
      category: raw.category || null,
      salary_min: salary.salary_min,
      salary_max: salary.salary_max,
      salary_period: salary.salary_period,
      source: "jobsireland",
      source_url: sourceUrl,
      jobsireland_ref: ref,
    };
  }

  _parseSalary(rawText) {
    const text = (rawText || "").replace(/\s+/g, " ").trim();
    if (!text || /confirmed|negotiable|competitive|not specified|tbc|community employment|programme rates/i.test(text)) {
      return { salary_type: "not_specified", salary_min: null, salary_max: null, salary_period: "annual" };
    }

    const period = /hour/i.test(text) ? "hourly" : /week/i.test(text) ? "weekly" : /month/i.test(text) ? "monthly" : "annual";
    const normalised = text.replace(/[€£$,]/g, "");
    const nums = (normalised.match(/\d+(\.\d+)?/g) || []).map(Number);

    if (nums.length >= 2) {
      return { salary_type: "range", salary_min: nums[0], salary_max: nums[1], salary_period: period };
    }
    if (nums.length === 1) {
      // Sanity: if period is "hourly" but amount > 100, it's likely annual (JobsIreland mislabels)
      const resolvedPeriod = (period === "hourly" && nums[0] > 100) ? "annual" : period;
      return { salary_type: "fixed", salary_min: nums[0], salary_max: nums[0], salary_period: resolvedPeriod };
    }
    return { salary_type: "not_specified", salary_min: null, salary_max: null, salary_period: "annual" };
  }

  _mapCareerLevel(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("entry") || t.includes("junior")) return "entry_level";
    if (t.includes("senior")) return "senior";
    if (t.includes("manager") || t.includes("management")) return "manager";
    if (t.includes("executive") || t.includes("director")) return "director";
    if (t.includes("mid") || t.includes("experienced")) return "mid_level";
    return null;
  }

  async trackExternalClick(id) {
    await this.db.Job.increment("external_clicks", { where: { id } });
    return { success: true };
  }

  async resubmit(id, data, user) {
    const job = await this.db.Job.findByPk(id);
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");
    if (job.status !== "flagged") throw this.errorManager.getError("BAD_REQUEST", "Only flagged jobs can be resubmitted.");

    const isOwner = user && job.created_by === user.email;
    if (!isOwner && user.role !== "admin") throw this.errorManager.getError("FORBIDDEN", "Only the job owner can resubmit.");

    // Update title/description if provided
    if (data.title) job.title = data.title;
    if (data.description) job.description = data.description;

    // Re-run AI moderation
    const moderationService = new ContentModerationService();
    const result = await moderationService.scan(job.title, job.description);

    if (result.approved) {
      await job.update({
        title: job.title,
        description: job.description,
        status: "approved",
        moderation_result: result,
        approved_at: new Date(),
        expires_at: new Date(Date.now() + (job.listing_duration || 30) * 24 * 60 * 60 * 1000),
      });
      try {
        const { notify } = await import("./notifier.js");
        const ownerUser = await this.db.User.findOne({ where: { email: job.created_by } });
        if (ownerUser) {
          notify("JOB_APPROVED", { employer: { email: ownerUser.email, first_name: ownerUser.first_name }, job: { id: job.id, title: job.title } });
          await this.db.Notification.create({ user_id: ownerUser.id, type: "job", title: "Job Approved", message: `Your listing "${job.title}" is now live.`, link: `/jobs/${job.id}` });
        }
      } catch (e) { /* notification failure is non-blocking */ }
    } else {
      await job.update({
        title: job.title,
        description: job.description,
        status: "flagged",
        moderation_result: result,
      });
    }

    const fullJob = await this.db.Job.findByPk(job.id, {
      include: [
        { model: this.db.Employer, as: "employer", attributes: ["id", "company_name", "user_id"] },
        { model: this.db.JobAddon, as: "addons" },
      ],
    });
    return transformJob(fullJob);
  }

  async getReportData(id, user) {
    const job = await this.db.Job.findByPk(id, {
      include: [
        { model: this.db.Employer, as: "employer" },
        { model: this.db.JobAddon, as: "addons" },
      ],
    });
    if (!job) throw this.errorManager.getError("JOB_NOT_FOUND");

    const isOwner = user && job.created_by === user.email;
    const isAdmin = user && user.role === "admin";
    if (!isOwner && !isAdmin) throw this.errorManager.getError("FORBIDDEN", "Only the job owner can access this report.");

    if (!["approved", "expired"].includes(job.status) && !(job.status === "approved" || (job.expires_at && new Date(job.expires_at) < new Date()))) {
      // Allow approved or expired jobs only
    }

    const applicationCount = await this.db.Application.count({ where: { job_id: id } });

    const idSuffix = job.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const year = new Date(job.created_at).getFullYear();
    const referenceNumber = `JD-${year}-${idSuffix}`;

    const isExpired = job.expires_at && new Date(job.expires_at) < new Date();

    return {
      referenceNumber,
      dateGenerated: new Date().toISOString(),
      datePublished: job.approved_at || job.created_at,
      dateExpired: isExpired ? job.expires_at : null,
      isActive: !isExpired && job.status === "approved",
      title: job.title,
      companyName: job.company_name || job.employer?.company_name || "N/A",
      location: job.location || "N/A",
      locationFull: job.location_full || job.location || "N/A",
      sector: job.sector || "N/A",
      jobType: job.job_type || "N/A",
      workType: job.remote_work_mode || "N/A",
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryPeriod: job.salary_period,
      description: job.description || "",
      applicationMethod: job.application_method || "platform",
      viewsCount: job.views_count || 0,
      applicationCount,
      listingType: job.listing_type,
    };
  }

  async _syncJobPaymentStatus(job) {
    if (!job.payment_stripe_id) return;

    try {
      const session = await this.paymentService.stripeRequest(`/checkout/sessions/${encodeURIComponent(job.payment_stripe_id)}`, null, "GET");
      if (session.status === "complete" && session.payment_status === "paid") {
        console.log(`[StripeSync] Job ${job.id} found PAID on Stripe. Fulfilling...`);
        await this.paymentService.fulfillCheckoutSession(session);
      }
    } catch (err) {
      if (err.status === 404) {
        console.log(`[StripeSync] Stripe session ${job.payment_stripe_id} not found.`);
      } else {
        throw err;
      }
    }
  }
}

export default JobService;
