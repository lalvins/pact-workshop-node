const Database = require('better-sqlite3');
const path = require('path');
const ProductRepositoryPort = require('../ports/ProductRepositoryPort');
const Product = require('../domain/Product');

class SQLiteProductRepository extends ProductRepositoryPort {
  constructor(dbPath = path.join(__dirname, '../../products.db')) {
    super();
    this.db = new Database(dbPath);
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);
    const count = this.db.prepare('SELECT COUNT(*) as count FROM products').get();
    if (count.count === 0) {
      const insert = this.db.prepare('INSERT INTO products (id, name, price) VALUES (?, ?, ?)');
      insert.run('1', 'Coffee Mug', 12.99);
      insert.run('2', 'Laptop Stand', 49.99);
    }
  }

  async getAll() {
    return this.db.prepare('SELECT * FROM products').all().map((r) => new Product(r));
  }

  async getById(id) {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return row ? new Product(row) : null;
  }

  async create(product) {
    const id = String(Date.now());
    this.db.prepare('INSERT INTO products (id, name, price) VALUES (?, ?, ?)').run(id, product.name, product.price);
    return new Product({ id, ...product });
  }

  async update(id, data) {
    const info = this.db.prepare('UPDATE products SET name = ?, price = ? WHERE id = ?').run(data.name, data.price, id);
    if (info.changes === 0) return null;
    return new Product({ id, ...data });
  }

  async delete(id) {
    const info = this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return info.changes > 0;
  }
}

module.exports = SQLiteProductRepository;
