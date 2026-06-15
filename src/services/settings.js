class SettingsService {
  constructor(context) {
    this.db = context.db;
    this.errorManager = context.errorManager;
  }

  async getSiteSettings() {
    const setting = await this.db.SiteSetting.findOne({ where: { key: "site_settings" } });
    return setting?.value || {};
  }

  async updateSiteSettings(data) {
    const [setting, created] = await this.db.SiteSetting.findOrCreate({
      where: { key: "site_settings" },
      defaults: { key: "site_settings", value: data },
    });

    if (!created) {
      const merged = { ...setting.value, ...data };
      await setting.update({ value: merged });
      return merged;
    }

    return setting.value;
  }

  async listPageContent() {
    return this.db.PageContent.findAll({ order: [["created_at", "DESC"]] });
  }

  async getPageContent(slug) {
    const page = await this.db.PageContent.findOne({ where: { slug } });
    if (!page) throw this.errorManager.getError("NOT_FOUND", "Page content not found");
    return page;
  }

  async upsertPageContent(slug, data) {
    const [page, created] = await this.db.PageContent.findOrCreate({
      where: { slug },
      defaults: { slug, ...data },
    });

    if (!created) {
      await page.update(data);
    }

    return page;
  }

  async removePageContent(slug) {
    const page = await this.db.PageContent.findOne({ where: { slug } });
    if (!page) throw this.errorManager.getError("NOT_FOUND", "Page content not found");
    await page.destroy();
    return { success: true };
  }
}

export default SettingsService;
