const express = require('express');
const { ProductServiceHttpAdapter, ProductNotFoundError } = require('../adapters/ProductServiceHttpAdapter');
const GetProductUseCase = require('../application/GetProductUseCase');

const adapter = new ProductServiceHttpAdapter(process.env.PROVIDER_URL || 'http://localhost:3001');
const getProductUseCase = new GetProductUseCase(adapter);

const app = express();
app.use(express.json());

app.get('/product/:id', async (req, res) => {
  try {
    const product = await getProductUseCase.execute(req.params.id);
    res.json(product);
  } catch (err) {
    if (err.name === 'ProductNotFoundError') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Product Consumer Service running on port ${PORT}`);
});

module.exports = app;
