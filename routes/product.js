import ProductController from "../src/controllers/ProductController.js";

const Routes = [
  {
    path: "/products",
    method: "GET",
    controller: ProductController,
    action: "list",
    middlewares: [],
  },
  {
    path: "/products/addons",
    method: "GET",
    controller: ProductController,
    action: "addons",
    middlewares: [],
  },
  {
    path: "/products/cost-estimate",
    method: "POST",
    controller: ProductController,
    action: "costEstimate",
    middlewares: [],
  },
];

export default Routes;
