const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
// const authenticate = require('./middleware/authenticate');
const swagger = require('./middleware/swagger');
const validate = require('./middleware/validate');
const user = require('./handlers/user');

const router = new Router();

router.get('/docs', swagger);
router.get('/', (ctx) => ctx.redirect('/docs'));

router.use(bodyParser());

// router.use(authenticate);

router.post('/user', validate, user.add);
router.put('/user/:id', validate, user.update);
router.get('/user/:id', validate, user.get);
router.delete('/user/:id', validate, user.remove);

module.exports = router;
