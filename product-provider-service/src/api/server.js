const express = require('express');
const createRouter = require('./router');

const useInMemory = process.env.USE_IN_MEMORY_DB === 'true';
const repository = useInMemory
  ? new (require('../adapters/InMemoryProductRepository'))()
  : new (require('../adapters/SQLiteProductRepository'))();

const app = express();
app.use(express.json());
app.use(createRouter(repository));

const PORT = 3001;
app.listen(PORT, () => {
  const mode = useInMemory ? 'InMemory' : 'SQLite';
  console.log(`Product Provider Service running on port ${PORT} [${mode}]`);
});

module.exports = app;
