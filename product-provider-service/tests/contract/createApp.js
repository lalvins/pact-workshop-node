const express = require('express');
const createRouter = require('../../src/api/router');
const InMemoryProductRepository = require('../../src/adapters/InMemoryProductRepository');
const { registerProviderStates } = require('./providerStates');

/**
 * Builds the provider Express app for Pact contract testing.
 *
 * Injects InMemoryProductRepository so verification runs against
 * deterministic, pre-seeded data without touching the real database.
 * Also mounts the POST /_pact/provider_states endpoint used by the Verifier.
 */
function createTestApp() {
  const repository = new InMemoryProductRepository();

  const app = express();
  app.use(express.json());
  app.use(createRouter(repository));
  registerProviderStates(app, repository);

  return app;
}

module.exports = createTestApp;
