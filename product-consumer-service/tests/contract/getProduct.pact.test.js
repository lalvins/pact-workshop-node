const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const path = require('path');
const { ProductServiceHttpAdapter } = require('../../src/adapters/ProductServiceHttpAdapter');
const GetProductUseCase = require('../../src/application/GetProductUseCase');

const { like, decimal } = MatchersV3;

const pact = new PactV3({
  consumer: 'product-consumer-service',
  provider: 'product-provider-service',
  dir: path.resolve(__dirname, '../../../pacts'),
  logLevel: 'warn',
});

describe('Product Consumer Contract', () => {
  it('returns a product from the provider', () => {
    return pact
      .given('product with id "1" exists')
      .uponReceiving('a request to get product with id 1')
      .withRequest({
        headers: { Accept: 'application/json' },
        method: 'GET',
        path: '/products/1',
      })
      .willRespondWith({
        status: 200,
        body: {
          id: like('1'),
          name: like('Coffee Mug'),
          price: decimal(12.99),
        },
      })
      .executeTest(async (mockServer) => {
        const adapter = new ProductServiceHttpAdapter(mockServer.url);
        const useCase = new GetProductUseCase(adapter);

        const product = await useCase.execute('1');

        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(typeof product.price).toBe('number');
      });
  });
});
