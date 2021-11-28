const { createTestApi, users } = require('../utils/createTestApi');
const { CheckoutAPI } = require('@adyen/api-library');
const da = require('../services/da');

jest.mock('../services/da');

const tenMinutes = 1000 * 60 * 10;
const nineMinutesFiftyNineSeconds = tenMinutes - 1000;

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
  CheckoutAPI().payments.mockResolvedValue({ resultCode: 'Authorised' });
  da.fetchProductByStyleCode.mockResolvedValue({ tracking_id: 123456 });
});

beforeEach(() => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'));
});

afterAll(() => {
  api.stop();
  jest.useRealTimers();
});

test('PUT /listings/{id}/reservation returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.addListingReservation('TEST-ID')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('PUT /listings/{id}/reservation returns not found error when listing does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.addListingReservation('TEST-ID')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test("PUT /listings/{id}/reservation updates the listing's reservation", async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  const reservationResponse = await api.addListingReservation(
    addResponse.body.id
  );

  expect(reservationResponse.status).toEqual(200);
});

test('PUT /listings/{id}/reservation returns forbidden error when other user holds reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  jest.advanceTimersByTime(nineMinutesFiftyNineSeconds);

  api.setUser(users.MEMBER_B);

  await expect(api.addListingReservation(addResponse.body.id)).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});

test('PUT /listings/{id}/reservation extends reservation time when user already holds reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  jest.advanceTimersByTime(nineMinutesFiftyNineSeconds);

  await api.addListingReservation(addResponse.body.id);

  const reservationResponse = await api.addListingReservation(
    addResponse.body.id
  );

  expect(reservationResponse.status).toEqual(200);
});

test('PUT /listings/{id}/reservation allows new reservation when previous reservation expires', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  jest.advanceTimersByTime(tenMinutes);

  api.setUser(users.MEMBER_B);

  await api.addListingReservation(addResponse.body.id);

  const reservationResponse = await api.addListingReservation(
    addResponse.body.id
  );

  expect(reservationResponse.status).toEqual(200);
});

test('PUT /listings/{id}/reservation removes user`s reservation after subsequent reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse1 = await api.addListing(testListing);
  const addResponse2 = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse1.body.id);
  await api.addListingReservation(addResponse2.body.id);

  api.setUser(users.MEMBER_B);

  const reservationResponse = await api.addListingReservation(
    addResponse1.body.id
  );

  expect(reservationResponse.status).toEqual(200);
});

test('PUT /listings/{id}/reservation returns forbidden error when listing has been purchased', async () => {
  const paymentMethod = { type: 'scheme' };

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  await api.updateListingAddresses(addResponse.body.id, {
    billing_address: testAddress,
    delivery_address: testAddress
  });

  await api.makePayment(addResponse.body.id, paymentMethod);

  await expect(api.addListingReservation(addResponse.body.id)).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});
