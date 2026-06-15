import SettingsService from "../services/settings.js";

class SettingsController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.res = context.res;
    this.settingsService = new SettingsService(context);
  }

  async getSiteSettings() {
    return this.settingsService.getSiteSettings();
  }

  async updateSiteSettings() {
    return this.settingsService.updateSiteSettings(this.req.body);
  }

  async listPageContent() {
    return this.settingsService.listPageContent();
  }

  async getPageContent() {
    return this.settingsService.getPageContent(this.req.params.slug);
  }

  async upsertPageContent() {
    return this.settingsService.upsertPageContent(this.req.params.slug, this.req.body);
  }

  async removePageContent() {
    return this.settingsService.removePageContent(this.req.params.slug);
  }
}

export default SettingsController;
