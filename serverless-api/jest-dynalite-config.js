const yaml = require('js-yaml');
const fs = require('fs');

const { Resources } = yaml.load(
  fs.readFileSync('./serverless/dynamo.yml', 'utf8')
);

function getTableProperties({ Properties }) {
  delete Properties.PointInTimeRecoverySpecification;
  delete Properties.StreamSpecification;
  delete Properties.TimeToLiveSpecification;

  Properties.TableName = process.env.MYAPP_TABLE_NAME;

  return Properties;
}

module.exports = {
  tables: Object.values(Resources).map(getTableProperties)
};
