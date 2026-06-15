import ApplicationController from "../src/controllers/ApplicationController.js";
import { authenticate } from "../middlewares/authenticate.js";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const Routes = [
  {
    path: "/applications",
    method: "GET",
    controller: ApplicationController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/applications",
    method: "POST",
    controller: ApplicationController,
    action: "create",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/applications/guest",
    method: "POST",
    controller: ApplicationController,
    action: "guestApply",
    middlewares: [upload.single("file")],
    autoCommit: true,
  },
  {
    path: "/applications/:id",
    method: "GET",
    controller: ApplicationController,
    action: "get",
    middlewares: [authenticate],
  },
  {
    path: "/applications/:id",
    method: "PUT",
    controller: ApplicationController,
    action: "update",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/applications/:id/ask-info",
    method: "POST",
    controller: ApplicationController,
    action: "askForInfo",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/applications/:id/invite-interview",
    method: "POST",
    controller: ApplicationController,
    action: "inviteToInterview",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/applications/:id",
    method: "DELETE",
    controller: ApplicationController,
    action: "remove",
    middlewares: [authenticate],
    autoCommit: true,
  },
];

export default Routes;
