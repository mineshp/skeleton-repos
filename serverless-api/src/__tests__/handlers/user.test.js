const supertest = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../app');
const userModel = require('../../models/user');

jest.mock('uuid');
uuidv4.mockReturnValue('ABC-123');

let server = {};
let request = {};

beforeAll(() => {
  server = app.listen();
});
beforeEach(async () => {
  request = supertest(server);
});
afterAll(() => {
  server.close();
});

const createTestUser = async () => {
  const newUser = {
    firstName: 'Bob',
    surname: 'Marley',
    email: 'test@test.com'
  };

  return request.post('/user').send(newUser);
};

const getUser = async () => userModel.get('ABC-123');

test('POST /user creates a user', async () => {
  const newUser = {
    firstName: 'Bob',
    surname: 'Marley',
    email: 'test@test.com'
  };

  const { status } = await request.post('/user').send(newUser);

  expect(status).toEqual(200);
});

test('PUT /user/:id updates a user record', async () => {
  await createTestUser();
  const existingUser = await getUser();

  expect(existingUser).toEqual({
    id: 'ABC-123',
    firstName: 'Bob',
    surname: 'Marley',
    email: 'test@test.com'
  });

  const updateParams = {
    isAdmin: true
  };

  const { status, text } = await request
    .put('/user/ABC-123')
    .send(updateParams);

  expect(status).toEqual(200);
  expect(JSON.parse(text)).toEqual({
    Attributes: {
      id: 'ABC-123',
      firstName: 'Bob',
      surname: 'Marley',
      email: 'test@test.com',
      isAdmin: true
    }
  });
});

test('GET /user/:id gets a user record', async () => {
  await createTestUser();

  const { status, text } = await request.get('/user/ABC-123');

  expect(status).toEqual(200);
  expect(JSON.parse(text)).toEqual({
    id: 'ABC-123',
    firstName: 'Bob',
    surname: 'Marley',
    email: 'test@test.com'
  });
});

test('DELETE /user/:id deletes a user record', async () => {
  await createTestUser();

  const { status, text } = await request.delete('/user/ABC-123');

  expect(status).toEqual(200);
});
