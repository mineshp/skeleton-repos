const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');

jest.mock('../services/da');
jest.mock('../services/http');

const api = createTestApi();

beforeAll(() => {
  da.fetchProductByStyleCode.mockResolvedValue({
    name: 'Shoe',
    tracking_id: 123456
  });
});

afterAll(() => api.stop());

test('PUT /listings/{id} returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.updateListing('TEST-ID', {})).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('PUT /listings/{id} returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_MARKETPLACE_MANAGER);

  await expect(api.updateListing('TEST-ID', {})).rejects.toEqual({
    message: 'Authorization token could not be validated',
    status: 401
  });
});

test('PUT /listings/{id} updates listing for a non-approver admin user', async () => {
  const testListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '1.5',
    style_code: 'ABC-123'
  };

  const testUpdate = {
    ...testListing,
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
    price: 19.99,
    status: 'APPROVED'
  };

  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  const addResponse = await api.addListing(testListing);

  await api.updateListing(addResponse.body.id, {
    ...testListing,
    status: 'APPROVED'
  });

  api.setUser(users.MARKETPLACE_MANAGER);

  const updateResponse = await api.updateListing(
    addResponse.body.id,
    testUpdate
  );
  const getResponse = await api.getListing(addResponse.body.id);

  const expectedResponse = {
    ...testUpdate,
    id: addResponse.body.id,
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
    price: 1999,
    product_id: 123456,
    product_name: 'Shoe',
    status: 'AWAITING_APPROVAL'
  };

  expect(updateResponse.status).toEqual(200);
  expect(getResponse.status).toEqual(200);

  expect(updateResponse.body).toEqual(expectedResponse);
  expect(getResponse.body).toEqual(expectedResponse);
});

test('PUT /listings/{id} removes listing for a non-approver admin user', async () => {
  const testListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '1.5',
    style_code: 'ABC-123'
  };

  const testUpdate = {
    ...testListing,
    status: 'DISABLED'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  const addResponse = await api.addListing(testListing);

  const updateResponse = await api.updateListing(
    addResponse.body.id,
    testUpdate
  );
  const getResponse = await api.getListing(addResponse.body.id);

  const expectedResponse = {
    ...testUpdate,
    id: addResponse.body.id,
    price: 999,
    product_id: 123456,
    product_name: 'Shoe',
    status: 'DISABLED'
  };

  expect(updateResponse.status).toEqual(200);
  expect(getResponse.status).toEqual(200);

  expect(updateResponse.body).toEqual(expectedResponse);
  expect(getResponse.body).toEqual(expectedResponse);
});

test('PUT /listings/{id} updates listing for a approver admin user', async () => {
  const testListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '1.5',
    style_code: 'ABC-123'
  };

  const testUpdate = {
    ...testListing,
    status: 'APPROVED'
  };

  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  const addResponse = await api.addListing(testListing);

  const updateResponse = await api.updateListing(
    addResponse.body.id,
    testUpdate
  );
  const getResponse = await api.getListing(addResponse.body.id);

  const expectedResponse = {
    ...testUpdate,
    id: addResponse.body.id,
    price: 999,
    product_id: 123456,
    product_name: 'Shoe',
    status: 'APPROVED'
  };

  expect(updateResponse.status).toEqual(200);
  expect(getResponse.status).toEqual(200);

  expect(updateResponse.body).toEqual(expectedResponse);
  expect(getResponse.body).toEqual(expectedResponse);
});

test('PUT /listings/{id} aggregates approved listings and sends to the DA', async () => {
  const testListing1 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '1',
    style_code: 'ABC-123'
  };

  const testListing2 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 10,
    size: '2',
    style_code: 'ABC-123'
  };

  const testListing3 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 5,
    size: '3',
    style_code: 'ABC-123'
  };

  const testListing4 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 5,
    size: '3',
    style_code: 'ABC-123'
  };

  const testUpdate1 = {
    ...testListing1,
    status: 'APPROVED'
  };

  const testUpdate2 = {
    ...testListing2,
    status: 'APPROVED'
  };

  const testUpdate3 = {
    ...testListing3,
    status: 'AWAITING_APPROVAL'
  };

  const testUpdate4 = {
    ...testListing4,
    status: 'DISABLED'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  const testListings = await Promise.all([
    api.addListing(testListing1),
    api.addListing(testListing2),
    api.addListing(testListing3),
    api.addListing(testListing4)
  ]);

  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  await Promise.all([
    api.updateListing(testListings[0].body.id, testUpdate1),
    api.updateListing(testListings[1].body.id, testUpdate2),
    api.updateListing(testListings[2].body.id, testUpdate3),
    api.updateListing(testListings[3].body.id, testUpdate4)
  ]);

  expect(da.updateStock).nthCalledWith(4, {
    affiliate_id: 'affiliate:marketplace',
    currency: 'GBP',
    price: 10,
    sizes: ['1', '2'],
    stock_status: 'in-stock',
    style_code: 'ABC-123',
    url: 'https://thesolesupplier.co.uk'
  });
});
