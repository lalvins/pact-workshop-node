# Pact Contract Testing Workshop — Pre-Workshop Setup Guide

Please complete **all steps in this document before the workshop starts**. The session will begin directly with exercises; there will be no time to install or troubleshoot tooling on the day.

If you hit a blocker, reach out in the workshop Slack channel (or by e-mail) at least one day before.


## What You Will Learn

This workshop introduces **consumer-driven contract testing** using [Pact](https://docs.pact.io). You will work with two Node.js microservices that communicate over HTTP:

- **product-consumer-service** — a service that fetches product data from the provider
- **product-provider-service** — a REST API that serves product data

You will learn how to:

1. Write a **Pact consumer test** that defines what the consumer expects from the provider and generates a contract file (the _pact_)
2. Write a **Pact provider verification** test that proves the provider actually honours that contract
3. Understand the flow: consumer generates pact → pact file is shared → provider verifies it
4. Use **provider states** to set up the data the provider needs before each interaction is verified

The codebase follows a hexagonal architecture (ports & adapters), which keeps the domain logic decoupled from HTTP and database concerns — this makes the Pact integration clean and straightforward.


## Prerequisites

### Knowledge

You should be comfortable with:

- JavaScript / Node.js basics (modules, async/await, classes)
- HTTP fundamentals (methods, status codes, JSON)
- Running commands in a terminal

You do **not** need prior experience with Pact or contract testing — that is what the workshop teaches.

## Required Software

Install each item below and verify it works before the workshop.

### 1. Node.js 20 (LTS)

The workshop requires **Node.js 20**.

Check if you already have it:

```bash
node --version
# expected: v20.x.x
```

If not, install via [nvm](https://github.com/nvm-sh/nvm) (recommended):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell, then:
nvm install 20
nvm use 20
nvm alias default 20

node --version   # v20.x.x
npm --version    # 10.x.x
```

Alternatively, download the installer directly from [nodejs.org](https://nodejs.org).

### 2. A code editor

[Visual Studio Code](https://code.visualstudio.com) is recommended. Install the following extensions for the best experience:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **REST Client** (`humao.rest-client`) — useful for manually probing the running APIs


## Getting the Repository

```bash
git clone <repository-url>
cd pact-workshop
```

> The repository URL will be shared by the facilitator before the workshop.


## Installing Dependencies

Each service manages its own `node_modules`. Run the following from the **repository root**:

```bash
npm install --prefix product-consumer-service
npm install --prefix product-provider-service
```

Verify both completed without errors (warnings about deprecated packages are normal and can be ignored).


## Verify the Setup

Run each check below. Every command should exit successfully before you attend the workshop.

### Check 1 — Consumer contract test

This generates the pact file from the consumer's expectations:

```bash
npm run test:contract --prefix product-consumer-service
```

Expected output (abbreviated):

```
PASS  tests/contract/getProduct.pact.test.js
  Product Consumer Contract
    ✓ returns a product from the provider
```

A file should now exist at:

```
pacts/product-consumer-service-product-provider-service.json
```

Open it — it is a human-readable JSON document describing the contract between the two services.

### Check 2 — Provider contract verification

This starts the provider with an in-memory database, then verifies it against the pact file generated in Check 1:

```bash
npm run test:provider-verification --prefix product-provider-service
```

Expected output (abbreviated):

```
Verifying a pact between product-consumer-service and product-provider-service

  a request to get product with id 1
     Given product with id "1" exists
    returns a response which
      has status code 200 (OK)
      includes headers "Content-Type" with value "application/json" (OK)
      has a matching body (OK)

✓ tests/contract/provider.pact.test.js (1 test)
```

### Good news!!!
If you reached this point without issues, you are ready for the workshop!!!


### Check 3 — Provider service starts

```bash
npm run start:pact --prefix product-provider-service
# Product Provider Service running on port 3001 [InMemory]
```

Open a second terminal and test it manually:

```bash
curl http://localhost:3001/products/1
# {"id":"1","name":"Coffee Mug","price":12.99}
```

Stop the server with `Ctrl+C`.

### Check 4 — Consumer service starts

```bash
npm start --prefix product-consumer-service
# Product Consumer Service running on port 3000
```

With the provider also running (in another terminal), test the consumer:

```bash
curl http://localhost:3000/products/1
```

Stop both servers with `Ctrl+C`.


## Project Structure Reference

```
pact-workshop/
├── pacts/                          # Generated pact files (consumer → provider contract)
│   └── product-consumer-service-product-provider-service.json
│
├── product-consumer-service/
│   ├── src/
│   │   ├── domain/Product.js                       # Domain entity
│   │   ├── ports/ProductServicePort.js             # Abstract outbound port
│   │   ├── adapters/ProductServiceHttpAdapter.js   # HTTP adapter (calls provider)
│   │   ├── application/GetProductUseCase.js        # Application use case
│   │   └── api/server.js                           # Express server (port 3000)
│   └── tests/contract/
│       └── getProduct.pact.test.js                 # Consumer Pact test (writes the pact)
│
└── product-provider-service/
    ├── src/
    │   ├── domain/Product.js                       # Domain entity
    │   ├── ports/ProductRepositoryPort.js          # Abstract inbound port
    │   ├── adapters/SQLiteProductRepository.js     # Production adapter (SQLite)
    │   ├── adapters/InMemoryProductRepository.js   # Test adapter (deterministic, pre-seeded)
    │   └── api/
    │       ├── router.js                           # Route definitions (DI via repository)
    │       └── server.js                           # Express server (port 3001)
    └── tests/contract/
        ├── createApp.js        # Test-level app factory (injects InMemoryProductRepository)
        ├── providerStates.js   # Provider state handlers + /_pact/provider_states endpoint
        └── provider.pact.test.js  # Provider verification test
```


## Quick-Reference: All Commands

| What | Command |
|---|---|
| Install consumer deps | `npm install --prefix product-consumer-service` |
| Install provider deps | `npm install --prefix product-provider-service` |
| Run consumer contract test | `npm run test:contract --prefix product-consumer-service` |
| Run provider contract verification | `npm run test:contract --prefix product-provider-service` |
| Start provider (InMemory, for pact) | `npm run start:pact --prefix product-provider-service` |
| Start provider (SQLite, production) | `npm start --prefix product-provider-service` |
| Start consumer | `npm start --prefix product-consumer-service` |


## Troubleshooting

**`node: command not found`**
Node.js is not installed or not on your PATH. Follow the Node.js 20 installation steps above.

**`npm install` fails with registry errors**
Check your internet connection. If you are behind a corporate proxy, configure npm:
```bash
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

**Consumer test fails: `ECONNREFUSED`**
The consumer test uses a Pact mock server — it does not need the real provider running. If you see a connection error, check that port `3001` is not already in use:
```bash
lsof -i :3001
```

**Provider test fails: `EADDRINUSE: address already in use 127.0.0.1:3001`**
Another process is already listening on port 3001. Stop it before running the provider contract test.

**Provider test fails: `No such file or directory` for the pact file**
The consumer contract test must be run first to generate the pact file:
```bash
npm run test:contract --prefix product-consumer-service
```

**`better-sqlite3` native build error on Apple Silicon**
Run:
```bash
npm install --prefix product-provider-service --target_arch=arm64
```


*See you at the workshop!*
