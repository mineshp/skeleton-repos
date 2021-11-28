const db = require('../services/db');
const { v4: uuidv4 } = require('uuid');

const TableName = process.env.MYAPP_TABLE_NAME;

async function add(user) {
  return db.insert({ ...user, id: uuidv4() }, TableName);
}

async function get(id) {
  return db.get({ id }, TableName);
}

async function update(id, updateFields) {
  return db.update(id, updateFields, TableName);
}

async function remove(id) {
  return db.delete({ id }, TableName);
}

module.exports = {
  add,
  get,
  remove,
  update
};
