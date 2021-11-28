const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');
const id = require('../services/id');

jest.mock('../services/da');
jest.spyOn(id, 'generate');

const api = createTestApi();

const testListing = {
  images: {
    left_outside: 'left_outside.jpg'
  },
  price: 9.99,
  size: '1.5',
  style_code: 'ABC-123'
};

beforeAll(() => {
  da.fetchProductByStyleCode.mockResolvedValue({
    name: 'Shoe',
    tracking_id: 123456
  });
});

beforeEach(() =>
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'))
);

afterAll(() => {
  api.stop();
  jest.useRealTimers();
});

test('GET /orders/pending returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getPendingOrder()).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /orders/pending returns 404 when user has no pending order', async () => {
  api.setUser(users.MEMBER_A);

  await expect(api.getPendingOrder()).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test("GET /orders/pending returns user's pending order", async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  const getResponse = await api.getPendingOrder();

  const orderId = id.generate.mock.results[1].value;

  expect(getResponse.body).toEqual({
    delivery_method: 'Express Service',
    delivery_price: 799,
    images: {
      left_outside: 'left_outside.jpg'
    },
    listing_id: addResponse.body.id,
    order_id: `TSM-${orderId}`,
    processing_fee: 30,
    processing_fee_description: '3%',
    product_id: 123456,
    product_name: 'Shoe',
    product_price: 999,
    product_size: testListing.size,
    reserved_until: 1577837400,
    seller_fee: 30,
    total_price: 1828
  });
});
