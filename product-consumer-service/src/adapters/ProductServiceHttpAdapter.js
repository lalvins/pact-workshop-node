const axios = require('axios');
const ProductServicePort = require('../ports/ProductServicePort');
const Product = require('../domain/Product');

class ProductNotFoundError extends Error {
  constructor(productId) {
    super(`Product with id "${productId}" not found`);
    this.name = 'ProductNotFoundError';
  }
}

class ProductServiceHttpAdapter extends ProductServicePort {
  constructor(baseUrl = 'http://localhost:3001') {
    super();
    this.baseUrl = baseUrl;
  }

  async getProduct(productId) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/products/${productId}`);
      return new Product(data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        throw new ProductNotFoundError(productId);
      }
      throw err;
    }
  }
}

module.exports = { ProductServiceHttpAdapter, ProductNotFoundError };
