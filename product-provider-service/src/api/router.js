const express = require('express');

function createRouter(repository) {
  const router = express.Router();

  router.get('/products', async (req, res) => {
    const products = await repository.getAll();
    res.json(products);
  });

  router.get('/products/:id', async (req, res) => {
    const product = await repository.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  });

  router.post('/products', async (req, res) => {
    const product = await repository.create(req.body);
    res.status(201).json(product);
  });

  router.put('/products/:id', async (req, res) => {
    const product = await repository.update(req.params.id, req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  });

  router.delete('/products/:id', async (req, res) => {
    const deleted = await repository.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  });

  return router;
}

module.exports = createRouter;
