import SavedJobController from "../src/controllers/SavedJobController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/saved-jobs",
    method: "GET",
    controller: SavedJobController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/saved-jobs/toggle",
    method: "POST",
    controller: SavedJobController,
    action: "toggle",
    middlewares: [authenticate],
  },
  {
    path: "/saved-jobs/check",
    method: "GET",
    controller: SavedJobController,
    action: "check",
    middlewares: [authenticate],
  },
];

export default Routes;
