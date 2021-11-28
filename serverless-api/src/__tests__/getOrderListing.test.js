const { CheckoutAPI } = require('@adyen/api-library');
const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');
const id = require('../services/id');

jest.mock('../services/da');
jest.spyOn(id, 'generate');

const api = createTestApi();

const testListing = {
  images: { left_outside: 'left_outside.jpg' },
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
    tracking_id: 123456,
    variants: [
      {
        gallery: {
          images: [
            {
              alt: 'image',
              url: 'image.jpg'
            }
          ]
        }
      }
    ]
  });
});

beforeEach(() =>
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'))
);

afterAll(() => {
  api.stop();
  jest.useRealTimers();
});

test('GET /orders/:id/listing returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getListingForOrder('123abc')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test("GET /orders/:id/listing returns 404 when order doesn't exist", async () => {
  api.setUser(users.MEMBER_A);

  await expect(api.getListingForOrder('123abc')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('GET /orders/:id/listing returns the listing for an order', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);
  const listingId = addResponse.body.id;

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(listingId);
  await api.updateListingAddresses(listingId, testAddresses);
  await api.makePayment(listingId, paymentMethod);

  const orderId = id.generate.mock.results[1].value;
  const getResponse = await api.getListingForOrder(`TSM-${orderId}`);

  expect(getResponse.body).toEqual({
    id: listingId,
    images: { left_outside: 'left_outside.jpg' },
    price: 999,
    product_id: 123456,
    product_name: 'Shoe',
    size: '1.5',
    status: 'PURCHASED'
  });
});
