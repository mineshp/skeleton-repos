const { CheckoutAPI } = require('@adyen/api-library');
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

const testAddress = {
  address_line_1: 'Buckingham Palace',
  address_line_2: 'The Mall',
  city: 'London',
  first_name: 'Queen',
  last_name: 'Elizabeth',
  postcode: 'SW1A 1AA'
};

beforeAll(() => {
  Date.now = jest.fn(() => 1);
  CheckoutAPI().payments.mockResolvedValue({ message: 'Success' });
  da.fetchProductByStyleCode.mockResolvedValue({
    name: 'Shoe',
    tracking_id: 123456
  });
});

afterAll(() => api.stop());

test('GET /listings/{id}/pending-order returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getListing('TEST-ID')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /listings/{id}/pending-order returns 404 when listing does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.getListing('TEST-ID')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('GET /listings/{id}/pending-order returns forbidden when member does not hold reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await expect(
    api.getPendingOrderForListing(addResponse.body.id)
  ).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});

test('GET /listings/{id}/pending-order returns pending order for a listing', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, {
    billing_address: testAddress,
    delivery_address: testAddress
  });

  const getResponse = await api.getPendingOrderForListing(addResponse.body.id);

  const orderId = id.generate.mock.results[1].value;

  expect(getResponse.body).toEqual({
    buyer_addresses: {
      billing_address: testAddress,
      delivery_address: testAddress
    },
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
    reserved_until: 600,
    seller_fee: 30,
    total_price: 1828
  });
});
