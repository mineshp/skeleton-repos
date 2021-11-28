const { createTestApi, users } = require('../utils/createTestApi');
const { CheckoutAPI } = require('@adyen/api-library');
const listingsModel = require('../models/listings');
const id = require('../services/id');
const da = require('../services/da');
const { PLACED } = require('../domain/orderStatuses');

const api = createTestApi();

const { ADYEN_MERCHANT_ACCOUNT, SELLER_MERCHANT_ACCOUNT } = process.env;

jest.mock('../services/id');
jest.mock('../services/da');

const paymentMethod = { type: 'scheme' };

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

beforeEach(() => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'));
  da.fetchProductByStyleCode.mockResolvedValue({
    name: 'Shoe',
    tracking_id: 123456
  });
});

afterAll(() => {
  api.stop();
  jest.useRealTimers();
});

test('POST /listings/{id}/checkout returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.makePayment('testlistingId')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('POST /listings/{id}/checkout rejects with error if payment is refused', async () => {
  id.generate.mockReturnValueOnce('testListingId');

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);

  CheckoutAPI().payments.mockResolvedValueOnce({
    refusalReasonCode: 1,
    resultCode: 'Refused'
  });

  await expect(
    api.makePayment(addResponse.body.id, paymentMethod)
  ).rejects.toEqual({
    message:
      'Payment failed. Please check your details or try again using a different payment method or card.',
    status: 400
  });
});

test('POST /listings/{id}/checkout makes payment and creates order', async () => {
  id.generate
    .mockReturnValueOnce('testListingId')
    .mockReturnValueOnce('testOrderId');

  CheckoutAPI().payments.mockResolvedValueOnce({
    additionalData: {
      cardSummary: '1142',
      paymentMethod: 'visa'
    },
    pspReference: 'pspReference',
    resultCode: 'Authorised'
  });

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);
  await api.updateListingAddresses(addResponse.body.id, testAddresses);
  const paymentResponse = await api.makePayment(
    addResponse.body.id,
    paymentMethod
  );

  expect(paymentResponse.status).toEqual(200);

  expect(CheckoutAPI().payments).toHaveBeenCalledWith({
    amount: { currency: 'GBP', value: 1828 },
    merchantAccount: ADYEN_MERCHANT_ACCOUNT,
    paymentMethod,
    reference: 'TSM-testOrderId',
    splits: [
      {
        account: SELLER_MERCHANT_ACCOUNT,
        amount: { value: 1768 },
        reference: 'payment_TSM-testOrderId',
        type: 'MarketPlace'
      },
      {
        amount: { value: 30 },
        reference: 'processing_fee_TSM-testOrderId',
        type: 'PaymentFee'
      },
      {
        amount: { value: 30 },
        reference: 'seller_fee_TSM-testOrderId',
        type: 'PaymentFee'
      }
    ]
  });

  const getOrderResponse = await api.getActiveOrderForListing(
    addResponse.body.id
  );

  expect(getOrderResponse.body).toEqual({
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
    order_no: 'TSM-testOrderId',
    payment_method: 'visa',
    processing_fee: 30,
    processing_fee_description: '3%',
    product_id: 123456,
    product_name: 'Shoe',
    product_price: 999,
    product_size: testListing.size,
    psp_reference: 'pspReference',
    seller_type: 'Business',
    status: PLACED,
    total_price: 1828
  });

  await expect(
    listingsModel.getById(addResponse.body.id)
  ).resolves.toMatchObject({
    buyer_id: 'MEMBER_A_UID',
    order_id: 'TSM-testOrderId',
    status: 'PURCHASED'
  });

  expect(da.updateStock).toHaveBeenCalledWith({
    affiliate_id: 'affiliate:marketplace',
    currency: 'GBP',
    sizes: [],
    stock_status: 'sold-out',
    style_code: 'ABC-123',
    url: 'https://thesolesupplier.co.uk'
  });
});

test('POST /listings/{id}/checkout maintains reserved price should listing price change', async () => {
  id.generate
    .mockReturnValueOnce('testListingId')
    .mockReturnValueOnce('testOrderId');

  CheckoutAPI().payments.mockResolvedValueOnce({ resultCode: 'Authorised' });

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  api.setUser(users.MARKETPLACE_MANAGER);

  await api.updateListing(addResponse.body.id, {
    ...testListing,
    price: 1000,
    status: 'APPROVED'
  });

  api.setUser(users.MEMBER_A);

  await api.updateListingAddresses(addResponse.body.id, testAddresses);

  const paymentResponse = await api.makePayment(addResponse.body.id, {
    paymentMethod
  });

  expect(paymentResponse.status).toEqual(200);

  expect(CheckoutAPI().payments).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: { currency: 'GBP', value: 1828 }
    })
  );
});
