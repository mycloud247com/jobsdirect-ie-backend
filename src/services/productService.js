/**
 * Product catalog service.
 * All products (listings, addons, credit bundles, subscriptions) are stored
 * in site_settings.products as a JSONB array. This service reads that config.
 *
 * Prices come from Stripe. 1 credit = €1.
 * credit_cost is overridden by the Stripe price (unit_amount / 100).
 */
import PaymentService from "./payment.js";

class ProductService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
    this._stripeCache = null;
    this._stripeCacheTime = 0;
  }

  async _getSettings() {
    const setting = await this.db.SiteSetting.findOne({ where: { key: "site_settings" } });
    return setting?.value || {};
  }

  async _fetchStripePrices(products) {
    // Cache Stripe prices for 5 minutes to avoid hammering the API
    if (this._stripeCache && Date.now() - this._stripeCacheTime < 5 * 60 * 1000) {
      return this._stripeCache;
    }
    const paymentService = new PaymentService({ db: this.db, errorManager: this.errorManager });
    const priceMap = {};
    await Promise.all(
      products.filter(p => p.stripe_product_id).map(async (p) => {
        try {
          const priceData = await paymentService._fetchDefaultPrice(p.stripe_product_id);
          if (priceData) {
            priceMap[p.id] = priceData.unit_amount; // cents
          }
        } catch {}
      })
    );
    this._stripeCache = priceMap;
    this._stripeCacheTime = Date.now();
    return priceMap;
  }

  async getProducts() {
    const settings = await this._getSettings();
    const products = Array.isArray(settings.products) ? settings.products : [];
    const enabled = products.filter((p) => p.enabled !== false);

    // Enrich with Stripe prices — 1 credit = €1
    try {
      const priceMap = await this._fetchStripePrices(enabled);
      for (const p of enabled) {
        if (priceMap[p.id] != null) {
          p.stripe_price = priceMap[p.id]; // cents
          p.credit_cost = Math.round(priceMap[p.id] / 100); // euros = credits
        }
      }
    } catch (err) {
      console.error("[ProductService] Failed to fetch Stripe prices:", err.message);
    }

    return enabled;
  }

  async getAllProducts() {
    const settings = await this._getSettings();
    return Array.isArray(settings.products) ? settings.products : [];
  }

  async getProductsByType(type) {
    const products = await this.getProducts();
    return products.filter((p) => p.type === type);
  }

  async getProduct(id) {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  }

  async getListingProduct() {
    const products = await this.getProducts();
    return products.find((p) => p.type === "listing") || null;
  }

  async getJobAddons() {
    const products = await this.getProducts();
    return products.filter((p) => p.type === "addon" && p.appliesTo === "job");
  }

  /**
   * Calculate total credit cost for a job posting.
   * @param {string[]} selectedAddonIds — e.g. ["addon_featured", "addon_highlight"]
   * @returns {{ total, listing, addons: [{ id, name, credit_cost }] }}
   */
  async calculateJobCost(selectedAddonIds = []) {
    const products = await this.getProducts();
    const listing = products.find((p) => p.type === "listing");
    if (!listing) {
      throw this.errorManager.getError("BAD_REQUEST", "No listing product configured. Ask admin to set up products in Settings.");
    }

    const validAddons = products.filter(
      (p) => p.type === "addon" && selectedAddonIds.includes(p.id),
    );

    const listingCost = listing.credit_cost || 0;
    const addonCost = validAddons.reduce((sum, a) => sum + (a.credit_cost || 0), 0);

    return {
      total: listingCost + addonCost,
      listing: { id: listing.id, name: listing.name, credit_cost: listingCost },
      addons: validAddons.map((a) => ({
        id: a.id,
        name: a.name,
        credit_cost: a.credit_cost || 0,
      })),
    };
  }
}

export default ProductService;
