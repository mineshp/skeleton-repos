let ValidationError = require('../errors/ValidationError');
let apiSchemaBuilder = require('api-schema-builder');
let path = require('path');

let schemaPath = path.join(__dirname, '../schema/swagger.yml');
let schema = apiSchemaBuilder.buildSchemaSync(schemaPath);

function validateSchema(schema, target) {
  schema.validate(target);

  if (schema.errors)
    throw new ValidationError(JSON.stringify(schema.errors, null, 2));
}

async function validate({ request, routerPath }, next) {
  const { parameters, body } = schema[routerPath][request.method.toLowerCase()];

  if (parameters)
    validateSchema(parameters, { path: request.params, query: request.query });

  if (body) validateSchema(body, request.body);

  await next();
}

module.exports = validate;
