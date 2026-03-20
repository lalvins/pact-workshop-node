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
✓ tests/contract/getProduct.pact.test.js (1 test)
```

The pact file at `pacts/product-consumer-service-product-provider-service.json` is
generated with one interaction.

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
FAIL  tests/contract/getProduct.pact.test.js
  × returns a product from the provider

Request was not matched: GET /product/1
No interaction found for GET /product/1
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

### C3 — Add a POST expectation the provider cannot satisfy

Add a consumer test for `POST /products` that expects a `sku` field in the response.
The provider does not return `sku`. The consumer test will pass (the mock serves
whatever we define), but provider verification will fail.

**Step 1 — Add the test**

Add a second `it` block to `product-consumer-service/tests/contract/getProduct.pact.test.js`:

```js
it('creates a product and returns it with a sku', () => {
  return pact
    .given('the provider can create a product')
    .uponReceiving('a POST request to create a product')
    .withRequest({
      method: 'POST',
      path: '/products',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: like('Coffee Mug'),
        price: decimal(12.99),
      },
    })
    .willRespondWith({
      status: 201,
      body: {
        id: like('1'),
        name: like('Coffee Mug'),
        price: decimal(12.99),
        sku: like('MUG-001'),   // ← provider does not return this
      },
    })
    .executeTest(async (mockServer) => {
      const axios = require('axios');
      const { data } = await axios.post(`${mockServer.url}/products`, {
        name: 'Coffee Mug',
        price: 12.99,
      });
      expect(data.sku).toBeDefined();
    });
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

## Provider Exercises

### P1 — Run exercise C3 against the provider

The pact file contains the `sku` expectation from C3. Run provider verification to
see it fail.

```bash
npm run test:contract --prefix product-provider-service
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
npm run test:contract --prefix product-provider-service   # back to green
```

---

### P2 — Breaking change: wrong status code on POST

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
npm run test:contract --prefix product-provider-service
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

### P3 — Breaking change: wrong field type

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
npm run test:contract --prefix product-provider-service
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

### P4 — Breaking change: renamed field

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
npm run test:contract --prefix product-provider-service
```

**Expected output (failure)**

```
1) Verifying a pact between product-consumer-service and product-provider-service
     a request to get product with id 1
       Body had differences:
         $.name -> Expected 'Coffee Mug' (like) but was missing
```

**Fix**

```js
res.json(product);
```

```bash
npm run test:contract --prefix product-provider-service   # back to green
```

---

## Quick reference

| Exercise | Command |
|---|---|
| C1 | `npm run test:contract --prefix product-consumer-service` |
| C2 | `npm run test:contract --prefix product-consumer-service` |
| C3 | `npm run test:contract --prefix product-consumer-service` then `--prefix product-provider-service` |
| P1 | `npm run test:contract --prefix product-provider-service` |
| P2 | `npm run test:contract --prefix product-provider-service` |
| P3 | `npm run test:contract --prefix product-provider-service` |
| P4 | `npm run test:contract --prefix product-provider-service` |
