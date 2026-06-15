import multer from "multer";
import CVController from "../src/controllers/CVController.js";
import { authenticate } from "../middlewares/authenticate.js";

// Use memory storage — files go to S3, not local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const Routes = [
  {
    path: "/cvs",
    method: "GET",
    controller: CVController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/cvs/upload",
    method: "POST",
    controller: CVController,
    action: "upload",
    middlewares: [authenticate, upload.single("file")],
  },
  {
    path: "/cvs/:id/default",
    method: "PUT",
    controller: CVController,
    action: "setDefault",
    middlewares: [authenticate],
  },
  {
    path: "/cvs/:id/content",
    method: "PUT",
    controller: CVController,
    action: "updateContent",
    middlewares: [authenticate],
  },
  {
    path: "/cvs/:id",
    method: "DELETE",
    controller: CVController,
    action: "remove",
    middlewares: [authenticate],
  },
  {
    path: "/cvs/generate",
    method: "POST",
    controller: CVController,
    action: "generate",
    middlewares: [authenticate],
  },
  {
    path: "/cvs/:id/download",
    method: "GET",
    controller: CVController,
    action: "download",
    middlewares: [authenticate],
  },
];

export default Routes;
