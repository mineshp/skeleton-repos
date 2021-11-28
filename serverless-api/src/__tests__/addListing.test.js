const { createTestApi, users } = require('../utils/createTestApi');
const id = require('../services/id');
const da = require('../services/da');

jest.mock('../services/id');
jest.mock('../services/da');

const api = createTestApi();

beforeAll(() => {
  id.generate.mockReturnValue('TEST-ID');
});

afterAll(() => api.stop());

test('POST /listings returns authorization error when no client ID provided', async () => {
  const testListing = {
    size: '1.5',
    style_code: 'ABC-123'
  };

  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.addListing(testListing)).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('POST /listings returns authorization error when auth token invalid', async () => {
  const testListing = {
    size: '1.5',
    style_code: 'ABC-123'
  };

  api.setUser(users.INVALID_MARKETPLACE_MANAGER);

  await expect(api.addListing(testListing)).rejects.toEqual({
    message: 'Authorization token could not be validated',
    status: 401
  });
});

test('POST /listings saves new listing', async () => {
  da.fetchProductByStyleCode.mockResolvedValueOnce({
    name: 'Shoe',
    tracking_id: 123456
  });

  const testListing = {
    images: {
      accessories: 'accessories.jpg',
      box_details: 'box_details.jpg',
      box_top: 'box_top.jpg',
      left_inside: 'left_inside.jpg',
      left_outside: 'left_outside.jpg',
      left_size: 'left_size.jpg',
      rear: 'rear.jpg',
      right_inside: 'right_inside.jpg',
      right_outside: 'right_outside.jpg',
      right_size: 'right_size.jpg',
      sole: 'sole.jpg',
      top: 'top.jpg'
    },
    price: 9.99,
    size: '1.5',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);
  const getResponse = await api.getListing('TEST-ID');

  const expectedSavedListing = {
    ...testListing,
    id: 'TEST-ID',
    images: {
      accessories: 'accessories.jpg',
      box_details: 'box_details.jpg',
      box_top: 'box_top.jpg',
      left_inside: 'left_inside.jpg',
      left_outside: 'left_outside.jpg',
      left_size: 'left_size.jpg',
      rear: 'rear.jpg',
      right_inside: 'right_inside.jpg',
      right_outside: 'right_outside.jpg',
      right_size: 'right_size.jpg',
      sole: 'sole.jpg',
      top: 'top.jpg'
    },
    price: 999,
    product_id: 123456,
    product_name: 'Shoe',
    status: 'AWAITING_APPROVAL'
  };

  expect(addResponse.status).toEqual(200);
  expect(getResponse.status).toEqual(200);

  expect(addResponse.body).toEqual(expectedSavedListing);
  expect(getResponse.body).toEqual(expectedSavedListing);
});

test('POST /listings returns 404 if product not found in DA', async () => {
  da.fetchProductByStyleCode.mockResolvedValueOnce();

  const testListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '1.5',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  await expect(api.addListing(testListing)).rejects.toEqual({
    message: 'No product found for style code',
    status: 404
  });
});
