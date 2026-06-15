import SettingsController from "../src/controllers/SettingsController.js";
import { authenticate, adminRequired } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/settings/site",
    method: "GET",
    controller: SettingsController,
    action: "getSiteSettings",
    middlewares: [],
  },
  {
    path: "/settings/site",
    method: "PUT",
    controller: SettingsController,
    action: "updateSiteSettings",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
  {
    path: "/settings/pages",
    method: "GET",
    controller: SettingsController,
    action: "listPageContent",
    middlewares: [],
  },
  {
    path: "/settings/pages/:slug",
    method: "GET",
    controller: SettingsController,
    action: "getPageContent",
    middlewares: [],
  },
  {
    path: "/settings/pages/:slug",
    method: "PUT",
    controller: SettingsController,
    action: "upsertPageContent",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
  {
    path: "/settings/pages/:slug",
    method: "DELETE",
    controller: SettingsController,
    action: "removePageContent",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
];

export default Routes;
