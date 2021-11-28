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
  postcode: 'SW1A 1AA',
  telephone_number: '07887646106'
};

const testAddresses = {
  billing_address: testAddress,
  delivery_address: testAddress
};

beforeEach(() => {
  da.fetchProductByStyleCode.mockResolvedValue({ tracking_id: 123456 });
});

afterAll(() => api.stop());

test('PUT /listings/{id}/addresses returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(
    api.updateListingAddresses('TEST-ID', testAddresses)
  ).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('PUT /listings/{id}/addresses returns not found error when listing does not exist', async () => {
  api.setUser(users.MEMBER_A);

  await expect(
    api.updateListingAddresses('TEST-ID', testAddresses)
  ).rejects.toEqual({
    message: 'The requested item could not be found.',
    status: 404
  });
});

test('PUT /listings/{id}/addresses returns forbidden error when user does not hold reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await expect(
    api.updateListingAddresses(addResponse.body.id, testAddresses)
  ).rejects.toEqual({
    message: 'User was not allowed to perform requested action.',
    status: 403
  });
});

test('PUT /listings/{id}/addresses updates pending order when user holds reservation', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(addResponse.body.id);

  const putResponse = await api.updateListingAddresses(
    addResponse.body.id,
    testAddresses
  );

  const getResponse = await api.getPendingOrderForListing(addResponse.body.id);

  expect(putResponse.status).toEqual(200);
  expect(getResponse.status).toEqual(200);

  expect(getResponse.body.buyer_addresses).toEqual(testAddresses);

  expect(putResponse.status).toEqual(200);
});
