// ---------------------------------------------------------------------------
// Provider states — mirrors the Python PROVIDER_STATES dict + handler lookup
// and the @router.post("/_pact/provider_states") endpoint.
//
// The Verifier calls POST /_pact/provider_states before each interaction
// (equivalent to passing -s <url> to pact_verifier_cli) so we can set up
// any prerequisite data the interaction needs.
// ---------------------------------------------------------------------------

/**
 * Returns the provider states map for the given repository instance.
 * Each handler receives the state params and can read/write the repository
 * to set up exactly the data the interaction requires.
 *
 * @param {import('../../src/ports/ProductRepositoryPort')} repository
 */
function buildProviderStates(_repository) {
  return {
    'product with id "1" exists': async (_params) => {
      // InMemoryProductRepository is pre-seeded with id "1".
      // Use `repository` here if you need to assert or mutate state, e.g.:
      //   const product = await repository.getById('1');
      //   if (!product) await repository.create({ id: '1', name: 'Coffee Mug', price: 12.99 });
      console.log('[provider_states] "product with id \\"1\\" exists" — already seeded');
    },
    // Default / empty state handler
    '': async (_params) => {},
  };
}

/**
 * Registers the POST /_pact/provider_states endpoint on the given Express app.
 * Call this before starting the server used for Pact verification.
 *
 * @param {import('express').Application} app
 * @param {import('../../src/ports/ProductRepositoryPort')} repository
 */
function registerProviderStates(app, repository) {
  const PROVIDER_STATES = buildProviderStates(repository);

  app.post('/_pact/provider_states', async (req, res) => {
    const body = req.body;
    const stateName = body.state || body.name || '';
    const params = body.params || {};

    console.log('='.repeat(80));
    console.log('PACT PROVIDER STATES ENDPOINT CALLED');
    console.log('Request headers:', req.headers);
    console.log('Request body:', body);
    console.log(`Setting up provider state: '${stateName}' with params:`, params);

    const handler = PROVIDER_STATES[stateName] ?? PROVIDER_STATES[''];

    if (handler) {
      await handler(params);
    } else {
      console.warn(
        `[provider_states] Unknown state: '${stateName}'. Available: ${Object.keys(PROVIDER_STATES).join(', ')}`,
      );
    }

    res.json({ result: 'OK' });
  });
}

module.exports = { registerProviderStates };
