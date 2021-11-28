const { CheckoutAPI } = require('@adyen/api-library');
const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');

const tenMinutes = 1000 * 60 * 10;

jest.mock('../services/da');

const api = createTestApi();

const testListing = {
  images: {
    left_outside: 'left_outside.jpg'
  },
  price: 9.99,
  size: '1.5',
  style_code: 'ABC-123'
};

const testAddress = {
  address_line_1: 'Buckingham Palace',
  address_line_2: 'The Mall',
  city: 'London',
  first_name: 'Queen',
  last_name: 'Elizabeth',
  postcode: 'SW1A 1AA'
};

beforeAll(() => {
  CheckoutAPI().payments.mockResolvedValue({ message: 'Success' });
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

test('GET /listings/{id} returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getListing('TEST-ID')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /listings/{id} returns 404 when listing does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.getListing('TEST-ID')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('GET /listings/{id} returns a listing', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  const getResponse = await api.getListing(addResponse.body.id);

  const expectedSavedListing = {
    ...testListing,
    id: addResponse.body.id,
    price: 999,
    product_id: 123456,
    product_name: 'Shoe',
    status: 'AWAITING_APPROVAL'
  };

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual(expectedSavedListing);
});

test('GET /listings/{id} omits addresses added by previous user', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  await api.updateListingAddresses(addResponse.body.id, {
    billing_address: testAddress,
    delivery_address: testAddress
  });

  jest.advanceTimersByTime(tenMinutes);

  api.setUser(users.MEMBER_B);

  await api.addListingReservation(addResponse.body.id);

  const getResponse = await api.getListing(addResponse.body.id);

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body.buyer_addresses).toEqual(undefined);
});
