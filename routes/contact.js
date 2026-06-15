import ContactController from "../src/controllers/ContactController.js";
import { authenticate, adminRequired } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/contact",
    method: "GET",
    controller: ContactController,
    action: "list",
    middlewares: [authenticate, adminRequired],
  },
  {
    path: "/contact",
    method: "POST",
    controller: ContactController,
    action: "create",
    middlewares: [],
  },
  {
    path: "/contact/:id",
    method: "PUT",
    controller: ContactController,
    action: "update",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
  {
    path: "/contact/:id",
    method: "DELETE",
    controller: ContactController,
    action: "remove",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
];

export default Routes;
