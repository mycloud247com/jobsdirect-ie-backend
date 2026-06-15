import EmployeeController from "../src/controllers/EmployeeController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/employees",
    method: "GET",
    controller: EmployeeController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/employees/me",
    method: "GET",
    controller: EmployeeController,
    action: "getByUser",
    middlewares: [authenticate],
  },
  {
    path: "/employees/:id",
    method: "GET",
    controller: EmployeeController,
    action: "getById",
    middlewares: [authenticate],
  },
  {
    path: "/employees",
    method: "POST",
    controller: EmployeeController,
    action: "create",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employees/:id",
    method: "PUT",
    controller: EmployeeController,
    action: "update",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employees/:id",
    method: "DELETE",
    controller: EmployeeController,
    action: "remove",
    middlewares: [authenticate],
    autoCommit: true,
  },
];

export default Routes;
