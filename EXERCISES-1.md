# Pact Workshop — Hands-on Exercises

Apply each change, run the command, observe the output, then fix before moving on.

---

## Consumer Exercises

### C1 — Baseline: everything should be green

```bash
npm run test:contract --prefix product-consumer-service
```

**Expected output (green)**

```
✓ tests/contract/getProduct.pact.test.js (2)
   ✓ Product Consumer Contract (2)
     ✓ returns a product from the provider
     ✓ creates a product and returns it with a sku

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

The pact file at `pacts/product-consumer-service-product-provider-service.json` is
generated with two interactions.

---

### C2 — Consumer breaks its own commitment

The consumer test says it will call `GET /products/:id`. Change the adapter to call
a different path and watch the mock reject the request.

**Step 1 — Introduce the bug**

Open `product-consumer-service/src/adapters/ProductServiceHttpAdapter.js`:

```js
// BEFORE
const { data } = await axios.get(`${this.baseUrl}/products/${productId}`);
```

```js
// AFTER (wrong path — missing the 's')
const { data } = await axios.get(`${this.baseUrl}/product/${productId}`);
```

**Step 2 — Run**

```bash
npm run test:contract --prefix product-consumer-service
```

**Expected output (failure)**

```
[10:37:44.198] ERROR (43317): pact@12.5.2: Test failed for the following reasons:

  Mock server failed with the following mismatches:

        0) The following request was not expected: 
            Method: GET
            Path: /product/1
            Headers:
              accept: application/json, text/plain, */*
              accept-encoding: gzip, compress, deflate, br
              connection: keep-alive
              host: 127.0.0.1:63018
              user-agent: axios/1.13.6
```

The mock expected `GET /products/1` — what the interaction defined. The adapter
sent `GET /product/1`. Mismatch → test fails → pact file not updated.

**Step 3 — Fix**

Restore the correct path in `ProductServiceHttpAdapter.js`:

```js
const { data } = await axios.get(`${this.baseUrl}/products/${productId}`);
```

```bash
npm run test:contract --prefix product-consumer-service   # back to green
```

---

### C3 — Consumer drops a field it promised to send

The consumer test declares it will POST `{ name, price }`. Remove `name` from the
payload passed in `executeTest` and watch the mock reject the request.

**Step 1 — Introduce the bug**

In `product-consumer-service/tests/contract/getProduct.pact.test.js`:

```js
// BEFORE
const product = await useCase.execute({ name: 'Coffee Mug', price: 12.99 });
```

```js
// AFTER (breaking — name omitted from the actual request)
const product = await useCase.execute({ price: 12.99 });
```

**Step 2 — Run**

```bash
npm run test:contract --prefix product-consumer-service
```

**Expected output (failure)**

```
ERROR: pact@12.5.2: Test failed for the following reasons:

  Mock server failed with the following mismatches:

        0) The following request was incorrect:

                POST /products

                 1.0   $: Expected a Map with keys [name, price] but received one with keys [price]


Vitest caught 1 unhandled error during the test run.
```

The interaction declared the consumer will send `{ name, price }`. The actual
request only sent `{ price }`. Pact catches the missing key and reports it as an
unhandled error — the pact file is not updated.

**Step 3 — Fix**

Restore `name` in the `executeTest` call:

```js
const product = await useCase.execute({ name: 'Coffee Mug', price: 12.99 });
```

```bash
npm run test:contract --prefix product-consumer-service   # back to green
```

---

### C4 — Add a POST expectation the provider cannot satisfy

Modify the consumer test for `POST /products` and make it expects a `sku` field in the response.
The provider does not return `sku`. The consumer test will pass (the mock serves
whatever we define), but provider verification will fail.

**Step 1 — Modify the existing test**

Add a second `it` block to `product-consumer-service/tests/contract/getProduct.pact.test.js`:

```js
it('creates a product and returns it with a sku', () => {
    .
    .
    .
    .willRespondWith({
      status: 201,
      body: {
        id: like('1'),
        name: like('Coffee Mug'),
        price: decimal(12.99),
        sku: like('MUG-001'),   // ← provider does not return this
      },
    })
    .
    .
    .
});
```

**Step 2 — Run consumer tests**

```bash
npm run test:contract --prefix product-consumer-service
```

**Expected output (green — consumer side passes)**

```
✓ tests/contract/getProduct.pact.test.js (2 tests)
```

Both tests pass. The pact file now has two interactions. The mock served `sku`
because we told it to — but the real provider has no idea about this field yet.

---

### Step 3 - Run exercise C4 against the provider

The pact file contains the `sku` expectation from C4. Run provider verification to
see it fail.

```bash
npm run test:provider-verification --prefix product-provider-service
```

**Expected output (failure)**

```
1) Verifying a pact between product-consumer-service and product-provider-service
     a POST request to create a product
       Body had differences:
         $.sku -> Expected 'MUG-001' (like) but was missing
```

The real `POST /products` returns `{ id, name, price }` — no `sku`. The contract
caught the gap before any deployment.

**Fix — remove the unsatisfiable expectation**

Remove the `sku` field from the `willRespondWith` body and the assertion in C3,
then regenerate the pact:

```js
// Remove sku from willRespondWith body and from the executeTest assertion
.willRespondWith({
  status: 201,
  body: {
    id: like('1'),
    name: like('Coffee Mug'),
    price: decimal(12.99),
    // sku removed
  },
})
```

```bash
npm run test:contract --prefix product-consumer-service   # regenerate pact
npm run test:provider-verification --prefix product-provider-service   # back to green
```

---
## Provider Exercises

### P1 — Breaking change: wrong status code on POST

Change the `POST /products` handler to return `204` instead of `201`.

**Step 1 — Introduce the breaking change**

Open `product-provider-service/src/api/router.js`:

```js
// BEFORE
res.status(201).json(product);
```

```js
// AFTER (breaking — wrong status code)
res.status(204).json(product);
```

**Step 2 — Run provider verification**

```bash
npm run test:provider-verification --prefix product-provider-service
```

**Expected output (failure)**

```
1) Verifying a pact between product-consumer-service and product-provider-service
     a POST request to create a product
       Status code had differences:
         Expected: 201
         Actual:   204
```

**Fix**

```js
res.status(201).json(product);
```

```bash
npm run test:contract --prefix product-provider-service   # back to green
```

---

### P2 — Breaking change: wrong field type

Change `price` to be returned as a string instead of a number.

**Step 1 — Introduce the breaking change**

In `product-provider-service/src/api/router.js`, update the `GET /products/:id`
handler:

```js
// BEFORE
res.json(product);
```

```js
// AFTER (breaking — price is now a string)
res.json({ ...product, price: String(product.price) });
```

**Step 2 — Run provider verification**

```bash
npm run test:provider-verification --prefix product-provider-service
```

**Expected output (failure)**

```
1) Verifying a pact between product-consumer-service and product-provider-service
     a request to get product with id 1
       Body had differences:
         $.price -> Expected a decimal but received "12.99" (string)
```

**Fix**

```js
res.json(product);
```

```bash
npm run test:contract --prefix product-provider-service   # back to green
```

---

### P3 — Breaking change: renamed field

Rename `name` to `product_name` in the `GET /products/:id` response.

**Step 1 — Introduce the breaking change**

In `product-provider-service/src/api/router.js`:

```js
// BEFORE
res.json(product);
```

```js
// AFTER (breaking — field renamed)
res.json({ id: product.id, product_name: product.name, price: product.price });
```

**Step 2 — Run provider verification**

```bash
npm run test:provider-verification --prefix product-provider-service
```

**Expected output (failure)**

```
1) Verifying a pact between product-consumer-service and product-provider-service
     a request to get product with id 1
       Body had differences:
         1.1) has a matching body
           $ -> Actual map is missing the following keys: name
```

**Fix**

```js
res.json(product);
```

```bash
npm run test:provider-verification --prefix product-provider-service  # back to green
```

---

## Quick reference

| Exercise | Command |
|---|---|
| C1 | `npm run test:contract --prefix product-consumer-service` |
| C2 | `npm run test:contract --prefix product-consumer-service` |
| C3 | `npm run test:contract --prefix product-consumer-service` |
| C4 | `npm run test:contract --prefix product-consumer-service` then `--prefix product-provider-service` |
| P1 | `npm run test:provider-verification --prefix product-provider-service` |
| P2 | `npm run test:provider-verification --prefix product-provider-service` |
| P3 | `npm run test:provider-verification --prefix product-provider-service` |
| P4 | `npm run test:provider-verification --prefix product-provider-service` |
