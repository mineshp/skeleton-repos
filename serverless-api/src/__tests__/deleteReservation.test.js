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

const testAddresses = {
  billing_address: testAddress,
  delivery_address: testAddress
};

beforeAll(() => {
  CheckoutAPI().payments.mockResolvedValue({ resultCode: 'Authorised' });
  da.fetchProductByStyleCode.mockResolvedValue({ tracking_id: 123456 });
});

beforeEach(() =>
  jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01'))
);

afterAll(() => {
  api.stop();
  jest.useRealTimers();
});

test('DELETE /listings/{id}/reservation returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.removeListingReservation('TEST-ID')).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('DELETE /listings/{id}/reservation returns not found error when listing does not exist', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.removeListingReservation('TEST-ID')).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test("DELETE /listings/{id}/reservation removes the listing's reservation", async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  const reservationResponse = await api.removeListingReservation(
    addResponse.body.id
  );

  expect(reservationResponse.status).toEqual(200);

  await expect(
    api.updateListingAddresses(addResponse.body.id, testAddresses)
  ).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});

test('DELETE /listings/{id}/reservation returns forbidden error when other user holds reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  jest.advanceTimersByTime(nineMinutesFiftyNineSeconds);

  api.setUser(users.MEMBER_B);

  await expect(
    api.removeListingReservation(addResponse.body.id)
  ).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});
