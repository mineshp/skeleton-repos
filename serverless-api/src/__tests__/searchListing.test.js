const { createTestApi, users } = require('../utils/createTestApi');
const da = require('../services/da');

jest.mock('../services/da');

const api = createTestApi();

beforeAll(() => {
  da.fetchProductByStyleCode.mockResolvedValue({
    name: 'Shoe',
    tracking_id: 123456
  });
});

afterAll(() => api.stop());

test('GET /listings returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_MARKETPLACE_MANAGER);

  await expect(api.searchListings('TEST-ID')).rejects.toEqual({
    message: 'Authorization token could not be validated',
    status: 401
  });
});

test('GET /listings returns listings for a style code sorted by size', async () => {
  const testListing1 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '10',
    style_code: 'ABC-123'
  };

  const testListing2 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '9',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  const id1 = (await api.addListing(testListing1)).body.id;
  const id2 = (await api.addListing(testListing2)).body.id;

  const searchResponse = await api.searchListings({ styleCode: 'ABC-123' });

  const expectedListings = [
    {
      ...testListing2,
      id: id2,
      price: 999,
      status: 'AWAITING_APPROVAL'
    },
    {
      ...testListing1,
      id: id1,
      price: 999,
      status: 'AWAITING_APPROVAL'
    }
  ];

  expect(searchResponse.status).toEqual(200);
  expect(searchResponse.body).toMatchObject(expectedListings);
});

test('GET /listings returns listings for a product ID sorted by size', async () => {
  const testListing1 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '10',
    style_code: 'ABC-123'
  };

  const testListing2 = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 9.99,
    size: '9',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  const id1 = (await api.addListing(testListing1)).body.id;
  const id2 = (await api.addListing(testListing2)).body.id;

  const { status, body } = await api.searchListings({ productId: 123456 });

  const expectedListings = [
    {
      ...testListing2,
      id: id2,
      price: 999,
      status: 'AWAITING_APPROVAL'
    },
    {
      ...testListing1,
      id: id1,
      price: 999,
      status: 'AWAITING_APPROVAL'
    }
  ];

  expect(status).toEqual(200);
  expect(body).toMatchObject(expectedListings);
});

test('GET /listings returns filtered listings for a product ID for member', async () => {
  const baseListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 2000,
    size: '20',
    style_code: 'ABC-123'
  };

  const approvedListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '1',
    style_code: 'ABC-123'
  };

  const reservedByUserListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '16',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  const testListings = await Promise.all([
    api.addListing(approvedListing),
    api.addListing(baseListing),
    api.addListing(baseListing),
    api.addListing(baseListing),
    api.addListing(reservedByUserListing),
    api.addListing(baseListing)
  ]);

  await Promise.all([
    api.updateListing(testListings[0].body.id, {
      ...approvedListing,
      status: 'APPROVED'
    }),
    api.updateListing(testListings[1].body.id, {
      ...baseListing,
      status: 'REJECTED'
    }),
    api.updateListing(testListings[2].body.id, {
      ...baseListing,
      status: 'DISABLED'
    }),
    api.updateListing(testListings[4].body.id, {
      ...baseListing,
      status: 'APPROVED'
    }),
    api.updateListing(testListings[5].body.id, {
      ...reservedByUserListing,
      status: 'APPROVED'
    })
  ]);

  api.setUser(users.MEMBER_A);

  await api.addListingReservation(testListings[4].body.id);

  api.setUser(users.MEMBER_B);

  await api.addListingReservation(testListings[5].body.id);

  const { status, body } = await api.searchListings({ productId: 123456 });

  const daProductData = {
    product_id: 123456,
    product_name: 'Shoe'
  };

  const expectedListings = [
    {
      ...daProductData,
      id: testListings[0].body.id,
      images: {
        left_outside: 'left_outside.jpg'
      },
      price: 2000,
      size: approvedListing.size,
      status: 'APPROVED'
    },
    {
      ...daProductData,
      id: testListings[5].body.id,
      images: {
        left_outside: 'left_outside.jpg'
      },
      price: 2000,
      size: reservedByUserListing.size,
      status: 'APPROVED'
    }
  ];

  expect(status).toEqual(200);
  expect(body).toEqual(expectedListings);
});

test('GET /listings returns listings for a product ID and size for member', async () => {
  const sizeOneListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '1',
    style_code: 'ABC-123'
  };

  const sizeTwoListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '2',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  const testListings = await Promise.all([
    api.addListing(sizeOneListing),
    api.addListing(sizeTwoListing)
  ]);

  await Promise.all([
    api.updateListing(testListings[0].body.id, {
      ...sizeOneListing,
      status: 'APPROVED'
    }),
    api.updateListing(testListings[1].body.id, {
      ...sizeTwoListing,
      status: 'APPROVED'
    })
  ]);

  api.setUser(users.MEMBER_A);

  const { status, body } = await api.searchListings({
    productId: 123456,
    size: 1
  });

  const daProductData = {
    product_id: 123456,
    product_name: 'Shoe'
  };

  expect(status).toEqual(200);
  expect(body).toEqual([
    {
      ...daProductData,
      id: testListings[0].body.id,
      images: {
        left_outside: 'left_outside.jpg'
      },
      price: 2000,
      product_id: 123456,
      size: '1',
      status: 'APPROVED'
    }
  ]);
});

test('GET /listings returns bad request error when size queried without productId', async () => {
  api.setUser(users.MEMBER_A);

  await expect(api.searchListings({ size: '1' })).rejects.toEqual({
    message: 'Listings cannot be queried by size without productId',
    status: 400
  });
});

test('GET /listings returns all listings when no query provided', async () => {
  const sizeOneListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '1',
    style_code: 'ABC-123'
  };

  const sizeTwoListing = {
    images: {
      left_outside: 'left_outside.jpg'
    },
    price: 20,
    size: '2',
    style_code: 'ABC-123'
  };

  api.setUser(users.MARKETPLACE_MANAGER);

  await Promise.all([
    api.addListing(sizeOneListing),
    api.addListing(sizeTwoListing)
  ]);

  const { status, body } = await api.searchListings({});

  expect(status).toEqual(200);
  expect(body.length).toEqual(2);
});
