const ProductRepositoryPort = require('../ports/ProductRepositoryPort');
const Product = require('../domain/Product');

class InMemoryProductRepository extends ProductRepositoryPort {
  constructor() {
    super();
    this.products = [
      new Product({ id: '1', name: 'Coffee Mug', price: 12.99 }),
      new Product({ id: '2', name: 'Laptop Stand', price: 49.99 }),
    ];
  }

  async getAll() {
    return this.products;
  }

  async getById(id) {
    return this.products.find((p) => p.id === id) || null;
  }

  async create(product) {
    const newProduct = new Product({
      id: String(Date.now()),
      ...product,
    });
    this.products.push(newProduct);
    return newProduct;
  }

  async update(id, data) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.products[index] = new Product({ id, ...data });
    return this.products[index];
  }

  async delete(id) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }
}

module.exports = InMemoryProductRepository;
