const { CheckoutAPI } = require('@adyen/api-library');
const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');
const { PLACED } = require('../domain/orderStatuses');

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

test('GET /orders returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.searchOrders()).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /orders returns orders for buyer', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);
  const addResponse1 = await api.addListing(testListing);
  const addResponse2 = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  jest.advanceTimersByTime(1000);
  await api.addListingReservation(addResponse1.body.id);
  await api.updateListingAddresses(addResponse1.body.id, testAddresses);
  await api.makePayment(addResponse1.body.id, paymentMethod);

  jest.advanceTimersByTime(2000);
  await api.addListingReservation(addResponse2.body.id);
  await api.updateListingAddresses(addResponse2.body.id, testAddresses);
  await api.makePayment(addResponse2.body.id, paymentMethod);

  const [activeOrderResponse1, activeOrderResponse2] = await Promise.all([
    await api.getActiveOrderForListing(addResponse1.body.id),
    await api.getActiveOrderForListing(addResponse2.body.id)
  ]);

  const getResponse = await api.searchOrders();

  expect(getResponse.body).toEqual([
    {
      buyer_addresses: testAddresses,
      buyer_email: 'memberA@test.com',
      card_number: '1142',
      created_at: 1577836803,
      delivery_method: 'Express Service',
      delivery_price: 799,
      images: {
        left_outside: 'left_outside.jpg'
      },
      listing_id: addResponse2.body.id,
      order_no: activeOrderResponse2.body.order_no,
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
    },
    {
      buyer_addresses: testAddresses,
      buyer_email: 'memberA@test.com',
      card_number: '1142',
      created_at: 1577836801,
      delivery_method: 'Express Service',
      delivery_price: 799,
      images: {
        left_outside: 'left_outside.jpg'
      },
      listing_id: addResponse1.body.id,
      order_no: activeOrderResponse1.body.order_no,
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
    }
  ]);
});

test('GET /orders does not return orders for other buyers', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse1 = await api.addListing(testListing);
  const addResponse2 = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  jest.advanceTimersByTime(1000);
  await api.addListingReservation(addResponse1.body.id);
  await api.updateListingAddresses(addResponse1.body.id, testAddresses);
  await api.makePayment(addResponse1.body.id, paymentMethod);

  api.setUser(users.MEMBER_B);

  jest.advanceTimersByTime(2000);
  await api.addListingReservation(addResponse2.body.id);
  await api.updateListingAddresses(addResponse2.body.id, testAddresses);
  await api.makePayment(addResponse2.body.id, paymentMethod);

  const activeOrderResponse = await api.getActiveOrderForListing(
    addResponse2.body.id
  );

  const getResponse = await api.searchOrders();

  expect(getResponse.body).toEqual([
    {
      buyer_addresses: testAddresses,
      buyer_email: 'memberB@test.com',
      card_number: '1142',
      created_at: 1577836803,
      delivery_method: 'Express Service',
      delivery_price: 799,
      images: {
        left_outside: 'left_outside.jpg'
      },
      listing_id: addResponse2.body.id,
      order_no: activeOrderResponse.body.order_no,
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
    }
  ]);
});
