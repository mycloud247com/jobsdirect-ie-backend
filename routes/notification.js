import NotificationController from "../src/controllers/NotificationController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/notifications",
    method: "GET",
    controller: NotificationController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/notifications/:id/read",
    method: "POST",
    controller: NotificationController,
    action: "markAsRead",
    middlewares: [authenticate],
  },
  {
    path: "/notifications/read-all",
    method: "POST",
    controller: NotificationController,
    action: "markAllAsRead",
    middlewares: [authenticate],
  },
  {
    path: "/notifications/:id",
    method: "DELETE",
    controller: NotificationController,
    action: "remove",
    middlewares: [authenticate],
  },
];

export default Routes;
