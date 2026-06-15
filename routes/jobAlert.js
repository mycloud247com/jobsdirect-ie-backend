import JobAlertController from "../src/controllers/JobAlertController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/job-alerts",
    method: "GET",
    controller: JobAlertController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/job-alerts",
    method: "POST",
    controller: JobAlertController,
    action: "create",
    middlewares: [authenticate],
  },
  {
    path: "/job-alerts/:id",
    method: "PUT",
    controller: JobAlertController,
    action: "update",
    middlewares: [authenticate],
  },
  {
    path: "/job-alerts/:id/toggle",
    method: "POST",
    controller: JobAlertController,
    action: "toggle",
    middlewares: [authenticate],
  },
  {
    path: "/job-alerts/:id",
    method: "DELETE",
    controller: JobAlertController,
    action: "remove",
    middlewares: [authenticate],
  },
];

export default Routes;
