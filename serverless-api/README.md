# Serverless-API

Skeleton REST API running using the AWS serverless framework using dynamodb

## Setup

### AWS Alarms
 
- ApiAlarm5xx
  - Excessive 5xx server errors
  - Threshold: 10 in one 5 minute period

- ApiAlarm4xx
  - Excessive 4xx errors
  - Threshold: 50 in one 5 minute period

## Docs

Use swagger for documenting endpoints

http://localhost:3010/docs

## Local Development

``` bash
npm install
```

Create a `.env` file using the `template.env`.

Start the api

```bash
npm run dev
```

The API will run on http://localhost:3010

## Testing

Tests use supertest to validate api endpoints, mocking at the network level.

Run the tests with:

```bash
npm run test
```
