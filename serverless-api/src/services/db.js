const { DynamoDB } = require('aws-sdk');

const options = { region: 'eu-west-1' };

const testOptions = {
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  region: 'local',
  sslEnabled: false
};

const db = new DynamoDB.DocumentClient(
  process.env.MOCK_DYNAMODB_ENDPOINT ? testOptions : options
);

async function get(params, TableName) {
  return db
    .get({ Key: { ...params }, TableName })
    .promise()
    .then(({ Item }) => Item);
}

async function query(params, TableName) {
  return db
    .query({ ...params, TableName })
    .promise()
    .then(({ Items }) => Items);
}

async function scan(params, TableName) {
  return db
    .scan({ ...params, TableName })
    .promise()
    .then(({ Items }) => Items);
}

async function put(params, TableName) {
  return db.put({ ...params, TableName }).promise();
}

async function del(params, TableName) {
  return db.delete({ Key: { ...params }, TableName }).promise();
}

async function deleteMultiple(params, TableName) {
  db.batchWrite({ ...params, TableName }).promise();
}

// async function update(params, TableName) {
//   return db.update({ ...params, TableName }).promise();
// }

async function insert(params, TableName) {
  return db
    .put({
      ConditionExpression: 'attribute_not_exists(id)',
      Item: params,
      TableName
    })
    .promise();
}

async function update(id, fields, TableName) {
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const UpdateExpression = [];

  Object.entries(fields).forEach(([key, value]) => {
    ExpressionAttributeNames[`#${key}`] = key;
    ExpressionAttributeValues[`:${key}`] = value;
    UpdateExpression.push(`#${key} = :${key}`);
  });

  return db
    .update({
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Key: { id },
      ReturnValues: 'ALL_NEW',
      TableName,
      UpdateExpression: `SET ${UpdateExpression.join(',')}`
    })
    .promise();
}

module.exports = {
  delete: del,
  deleteMultiple,
  get,
  insert,
  put,
  query,
  scan,
  update
};
