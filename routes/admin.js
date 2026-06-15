import AdminController from "../src/controllers/AdminController.js";
import { authenticate, adminRequired } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/admin/users",
    method: "GET",
    controller: AdminController,
    action: "listUsers",
    middlewares: [authenticate, adminRequired],
  },
  {
    path: "/admin/users",
    method: "POST",
    controller: AdminController,
    action: "createUser",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
  {
    path: "/admin/users/:id",
    method: "PUT",
    controller: AdminController,
    action: "updateUser",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
  {
    path: "/admin/users/:id",
    method: "DELETE",
    controller: AdminController,
    action: "deleteUser",
    middlewares: [authenticate, adminRequired],
    autoCommit: true,
  },
];

export default Routes;
