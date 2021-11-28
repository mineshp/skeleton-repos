const user = require('../models/user');

async function add(ctx) {
  const addUser = await user.add(ctx.request.body);

  ctx.body = addUser;
}

async function get(ctx) {
  const getUser = await user.get(ctx.params.id);

  ctx.body = getUser;
}

async function update(ctx) {
  const updateUser = await user.update(ctx.params.id, ctx.request.body);

  ctx.body = updateUser;
}

async function remove(ctx) {
  const removeUser = await user.remove(ctx.params.id);

  ctx.body = removeUser;
}

module.exports = {
  add,
  get,
  remove,
  update
};
