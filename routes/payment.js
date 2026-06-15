import PaymentController from "../src/controllers/PaymentController.js";
import { authenticate } from "../middlewares/authenticate.js";

const Routes = [
  {
    path: "/payments/plans",
    method: "GET",
    controller: PaymentController,
    action: "listPlans",
    middlewares: [],
  },
  {
    path: "/payments",
    method: "GET",
    controller: PaymentController,
    action: "list",
    middlewares: [authenticate],
  },
  {
    path: "/payments/checkout",
    method: "POST",
    controller: PaymentController,
    action: "checkout",
    middlewares: [authenticate],
  },
  {
    path: "/payments/sync-session",
    method: "POST",
    controller: PaymentController,
    action: "syncSession",
    middlewares: [authenticate],
  },
  {
    path: "/payments/portal",
    method: "POST",
    controller: PaymentController,
    action: "portal",
    middlewares: [authenticate],
  },
  {
    path: "/payments/pricing",
    method: "GET",
    controller: PaymentController,
    action: "getPricing",
    middlewares: [],
  },
  {
    path: "/payments/balance",
    method: "GET",
    controller: PaymentController,
    action: "getBalance",
    middlewares: [authenticate],
  },
  {
    path: "/payments/transactions",
    method: "GET",
    controller: PaymentController,
    action: "transactions",
    middlewares: [authenticate],
  },
  {
    path: "/payments/invoices",
    method: "GET",
    controller: PaymentController,
    action: "getInvoices",
    middlewares: [authenticate],
  },
];

export default Routes;
