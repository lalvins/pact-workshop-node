class CreateProductUseCase {
  constructor(productServicePort) {
    this.productServicePort = productServicePort;
  }

  async execute(productData) {
    return this.productServicePort.createProduct(productData);
  }
}

module.exports = CreateProductUseCase;
