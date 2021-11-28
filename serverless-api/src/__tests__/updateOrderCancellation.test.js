const { CheckoutAPI } = require('@adyen/api-library');
const { createTestApi, users } = require('../utils/createTestApi');
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

const testCancellation = {
  reason: 'My dog ate them'
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

test('PUT /orders/{id}/cancellation returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(
    api.updateOrderTracking('TEST-ORDER-NO', testCancellation)
  ).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('PUT /orders/{id}/cancellation returns 404 if order does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(
    api.updateOrderCancellation('TEST-ORDER-NO', testCancellation)
  ).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('PUT /orders/{id}/cancellation returns forbidden for member', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  await api.makePayment(addResponse.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  await expect(
    api.updateOrderCancellation(
      activeOrderResponse.body.order_no,
      testCancellation
    )
  ).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});

test('PUT /orders/{id}/cancellation updates tracking for admin', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  jest.advanceTimersByTime(1000);
  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  await api.makePayment(addResponse.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  api.setUser(users.MARKETPLACE_MANAGER);

  await api.updateOrderCancellation(
    activeOrderResponse.body.order_no,
    testCancellation
  );

  const orderResponse = await api.getOrder(activeOrderResponse.body.order_no);

  expect(orderResponse.body).toMatchObject({
    cancellation_reason: 'My dog ate them',
    cancellation_time: 1577836801,
    status: 'CANCELLED'
  });
});

test('PUT /orders/{id}/cancellation returns bad request when order status complete', async () => {
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

  await api.updateOrderStatus(activeOrderResponse.body.order_no, 'COMPLETE');

  await expect(
    api.updateOrderCancellation(
      activeOrderResponse.body.order_no,
      testCancellation
    )
  ).rejects.toEqual({
    message: 'Order cancellation can only be updated on placed orders',
    status: 400
  });
});
