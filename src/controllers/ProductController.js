import ProductService from "../services/productService.js";

class ProductController {
  constructor(context) {
    this.context = context;
    this.req = context.req;
    this.productService = new ProductService(context);
  }

  async list() {
    return this.productService.getProducts();
  }

  async addons() {
    return this.productService.getJobAddons();
  }

  async costEstimate() {
    const { addonIds } = this.req.body;
    return this.productService.calculateJobCost(addonIds || []);
  }
}

export default ProductController;
