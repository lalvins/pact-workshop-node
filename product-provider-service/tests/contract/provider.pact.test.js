const { Verifier } = require('@pact-foundation/pact');
const path = require('node:path');
const createTestApp = require('./createApp');

// ---------------------------------------------------------------------------
// Configuration — mirrors the Python module-level constants
// ---------------------------------------------------------------------------

const PROVIDER_NAME = 'product-provider-service';
const PROVIDER_HOST = '127.0.0.1';
const PROVIDER_PORT = 3001;

const PACT_URL = process.env.PACT_URL || '';
const PACT_BROKER_BASE_URL = process.env.PACT_BROKER_BASE_URL || '';
const PACT_BROKER_TOKEN = process.env.PACT_BROKER_TOKEN || '';
const PACT_BROKER_USERNAME = process.env.PACT_BROKER_USERNAME || '';
const PACT_BROKER_PASSWORD = process.env.PACT_BROKER_PASSWORD || '';

const GIT_COMMIT = process.env.GIT_COMMIT || 'local-dev';
const GIT_BRANCH = process.env.GIT_BRANCH || 'local';

// Local pact file — used when neither PACT_URL nor PACT_BROKER_BASE_URL is set
const LOCAL_PACT_FILE = path.resolve(
  __dirname,
  '../../../pacts/product-consumer-service-product-provider-service.json',
);

// Consumer version selectors — mirrors MAIN_BRANCH_SELECTORS / FEATURE_BRANCH_SELECTORS
const MAIN_BRANCH_SELECTORS = [
  { mainBranch: true },
  { deployed: true },
  { released: true },
  { latest: true },
];

const FEATURE_BRANCH_SELECTORS = [
  { deployed: true },
  { matchingBranch: true },
  { released: true },
  { mainBranch: true },
];

// ---------------------------------------------------------------------------
// Helpers — mirrors _build_base_opts / build_direct_pact_command / build_broker_pact_command
// ---------------------------------------------------------------------------

function buildBaseOpts() {
  return {
    provider: PROVIDER_NAME,
    providerBaseUrl: `http://${PROVIDER_HOST}:${PROVIDER_PORT}`,
    providerStatesSetupUrl: `http://${PROVIDER_HOST}:${PROVIDER_PORT}/_pact/provider_states`,
    logLevel: process.env.VERBOSE === 'true' ? 'debug' : 'info',
    providerVersion: GIT_COMMIT,
    providerBranch: GIT_BRANCH,
  };
}

function buildDirectPactOpts(base) {
  // Mirrors build_direct_pact_command:
  //   webhook mode  → PACT_BROKER_BASE_URL still set → publish results back to broker
  //   local mode    → no broker URL                  → just verify the URL
  const brokerUrlSet = Boolean(PACT_BROKER_BASE_URL);

  const opts = { ...base, pactUrls: [PACT_URL] };

  if (brokerUrlSet) {
    console.log('[pact] Webhook mode — verifying PACT_URL and publishing results');
    opts.pactBrokerUrl = PACT_BROKER_BASE_URL;
    opts.publishVerificationResult = true;
  } else {
    console.log('[pact] Local mode — verifying PACT_URL without publishing');
  }

  if (PACT_BROKER_TOKEN) opts.pactBrokerToken = PACT_BROKER_TOKEN;

  return opts;
}

function buildBrokerPactOpts(base) {
  const isMain = GIT_BRANCH === 'main';
  const selectors = isMain ? MAIN_BRANCH_SELECTORS : FEATURE_BRANCH_SELECTORS;

  console.log(`[pact] Broker mode — branch "${GIT_BRANCH}", selectors: ${JSON.stringify(selectors)}`);

  const opts = {
    ...base,
    pactBrokerUrl: PACT_BROKER_BASE_URL,
    consumerVersionSelectors: selectors,
    enablePending: true,
    includeWipPactsSince: '2025-01-01',
    publishVerificationResult: true,
  };

  if (PACT_BROKER_TOKEN) {
    opts.pactBrokerToken = PACT_BROKER_TOKEN;
  } else if (PACT_BROKER_USERNAME && PACT_BROKER_PASSWORD) {
    opts.pactBrokerUsername = PACT_BROKER_USERNAME;
    opts.pactBrokerPassword = PACT_BROKER_PASSWORD;
  }

  return opts;
}

function buildLocalFileOpts(base) {
  console.log(`[pact] Local file mode — verifying ${LOCAL_PACT_FILE}`);
  return { ...base, pactUrls: [LOCAL_PACT_FILE] };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Provider Contract Verification', () => {
  let server;

  beforeAll(async () => {
    const app = createTestApp();

    await new Promise((resolve) => {
      server = app.listen(PROVIDER_PORT, PROVIDER_HOST, resolve);
    });

    console.log(`[pact] Provider running on http://${PROVIDER_HOST}:${PROVIDER_PORT}`);
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('verifies consumer contracts', async () => {
    const base = buildBaseOpts();
    let opts;

    if (PACT_URL) {
      console.log(`[pact] PACT_URL specified (${PACT_URL}), verifying against specific pact file`);
      opts = buildDirectPactOpts(base);
    } else if (PACT_BROKER_BASE_URL) {
      console.log(`[pact] No PACT_URL, fetching pacts dynamically from broker: ${PACT_BROKER_BASE_URL}`);
      opts = buildBrokerPactOpts(base);
    } else {
      opts = buildLocalFileOpts(base);
    }

    const verifier = new Verifier(opts);
    await verifier.verifyProvider();
  }, 60_000);
});
