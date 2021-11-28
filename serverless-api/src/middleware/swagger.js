const { koaSwagger } = require('koa2-swagger-ui');
const swaggerParser = require('swagger-parser');

const specBundle = swaggerParser.bundle('./src/schema/swagger.yml');

module.exports = async (ctx, next) => {
  const spec = await specBundle;

  spec.info.version = process.env.VERSION;
  spec.servers = [{ url: process.env.BASE_URL }];

  return koaSwagger({
    hideTopbar: true,
    swaggerOptions: {
      deepLinking: true,
      defaultModelExpandDepth: 1,
      defaultModelRendering: 'model',
      defaultModelsExpandDepth: 1,
      displayRequestDuration: true,
      spec
    },
    title: 'MyApp API'
  })(ctx, next);
};
