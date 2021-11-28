const { toLower } = require('lodash');

function genAlarm(name) {
  const nameParts = name.split(/(?=[A-Z])/g).map(toLower);

  const alarmName =
    "${opt:stage, 'qa'}" + `_MYAPP_${nameParts.join('_')}_lambda`;
  const value = "myapp-${opt:stage, 'qa'}-" + nameParts.join();

  return {
    Properties: {
      AlarmActions: [
        "arn:aws:sns:${self:provider.region}:805665609698:serverless-api-alarm-alerts-${opt:stage, 'qa'}",
      ],
      AlarmDescription: `Failure in ${nameParts.join(' ')} lambda function`,
      AlarmName: alarmName,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: value,
        },
      ],
      EvaluationPeriods: 1,
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Period: 300,
      Statistic: 'Sum',
      Threshold: 1,
      TreatMissingData: 'notBreaching',
    },
    Type: 'AWS::CloudWatch::Alarm',
  };
}

module.exports = async ({ resolveVariable }) => {
  const lambdas = await resolveVariable('self:functions');

  const alarms = {};

  Object.keys(lambdas).forEach((lambdaName) => {
    alarms[lambdaName + 'Errors'] = genAlarm(lambdaName);
  });

  return {
    alarms: {
      Resources: alarms,
    },
  };
};
