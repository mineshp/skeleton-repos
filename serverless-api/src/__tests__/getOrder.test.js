const { CheckoutAPI } = require('@adyen/api-library');
const { createTestApi, users } = require('../utils/createTestApi');
const { PLACED } = require('../domain/orderStatuses');

const da = require('../services/da');

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

const testAddresses = {
  billing_address: testAddress,
  delivery_address: testAddress
};

const paymentMethod = { type: 'scheme' };

beforeAll(() => {
  CheckoutAPI().payments.mockResolvedValue({
    additionalData: {
      cardSummary: '1142',
      paymentMethod: 'visa'
    },
    resultCode: 'Authorised'
  });

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

test('GET /orders/{id} returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getOrder('TEST-ORDER-NO')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /orders/{id} returns 404 if order does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.getOrder('TEST-ORDER-NO')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('GET /orders/{id} returns forbidden if user is not buyer of order', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  await api.makePayment(addResponse.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  api.setUser(users.MEMBER_B);

  await expect(api.getOrder(activeOrderResponse.body.order_no)).rejects.toEqual(
    {
      message: 'User was not allowed to perform requested action.',
      status: 403
    }
  );
});

test('GET /orders/{id} returns order for buyer', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  await api.makePayment(addResponse.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  const getResponse = await api.getOrder(activeOrderResponse.body.order_no);

  expect(getResponse.body).toEqual({
    buyer_addresses: testAddresses,
    buyer_email: 'memberA@test.com',
    card_number: '1142',
    created_at: 1577836800,
    delivery_method: 'Express Service',
    delivery_price: 799,
    images: {
      left_outside: 'left_outside.jpg'
    },
    listing_id: addResponse.body.id,
    order_no: expect.anything(),
    payment_method: 'visa',
    processing_fee: 30,
    processing_fee_description: '3%',
    product_id: 123456,
    product_name: 'Shoe',
    product_price: 999,
    product_size: testListing.size,
    seller_type: 'Business',
    status: PLACED,
    total_price: 1828
  });
});

test('GET /orders/{id} returns order for admin', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  await api.makePayment(addResponse.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  api.setUser(users.MARKETPLACE_MANAGER);

  const getResponse = await api.getOrder(activeOrderResponse.body.order_no);

  expect(getResponse.status).toEqual(200);
});
