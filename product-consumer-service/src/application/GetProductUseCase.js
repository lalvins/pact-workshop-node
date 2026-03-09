class GetProductUseCase {
  constructor(productServicePort) {
    this.productServicePort = productServicePort;
  }

  async execute(productId) {
    return this.productServicePort.getProduct(productId);
  }
}

module.exports = GetProductUseCase;
