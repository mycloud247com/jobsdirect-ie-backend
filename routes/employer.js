import multer from "multer";
import EmployerController from "../src/controllers/EmployerController.js";
import { authenticate } from "../middlewares/authenticate.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const Routes = [
  {
    path: "/employers",
    method: "GET",
    controller: EmployerController,
    action: "list",
    middlewares: [],
  },
  {
    path: "/employers/cro/search",
    method: "GET",
    controller: EmployerController,
    action: "searchCRO",
    middlewares: [authenticate],
  },
  {
    path: "/employers/cro/:num",
    method: "GET",
    controller: EmployerController,
    action: "getCROCompany",
    middlewares: [authenticate],
  },
  {
    path: "/employers/me",
    method: "GET",
    controller: EmployerController,
    action: "getByUser",
    middlewares: [authenticate],
  },
  {
    path: "/employers/profile/:slug",
    method: "GET",
    controller: EmployerController,
    action: "getPublicProfile",
    middlewares: [],
  },
  {
    path: "/employers/:id",
    method: "GET",
    controller: EmployerController,
    action: "getById",
    middlewares: [],
  },
  {
    path: "/employers",
    method: "POST",
    controller: EmployerController,
    action: "create",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employers/:id",
    method: "PUT",
    controller: EmployerController,
    action: "update",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employers/:id/verification-doc",
    method: "POST",
    controller: EmployerController,
    action: "uploadVerificationDoc",
    middlewares: [authenticate, upload.single("file")],
  },
  {
    path: "/employers/:id/submit-for-verification",
    method: "POST",
    controller: EmployerController,
    action: "submitForVerification",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employers/:id/document-requests",
    method: "GET",
    controller: EmployerController,
    action: "listDocumentRequests",
    middlewares: [authenticate],
  },
  {
    path: "/employers/:id/document-requests",
    method: "POST",
    controller: EmployerController,
    action: "createDocumentRequest",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employers/:id/document-requests/:requestId/upload",
    method: "POST",
    controller: EmployerController,
    action: "uploadDocument",
    middlewares: [authenticate, upload.single("file")],
  },
  {
    path: "/employers/:id/document-requests/:requestId/review",
    method: "PUT",
    controller: EmployerController,
    action: "reviewDocument",
    middlewares: [authenticate],
    autoCommit: true,
  },
  {
    path: "/employers/:id",
    method: "DELETE",
    controller: EmployerController,
    action: "remove",
    middlewares: [authenticate],
    autoCommit: true,
  },
];

export default Routes;
