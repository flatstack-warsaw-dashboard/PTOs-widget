import AWS from 'aws-sdk';

export async function putRequest(data: dynamoDbData) {
  const batchPutRequest: Array<Record<string, dynamoDbData>> = [];

  Object.entries(data).forEach(([key, value]) => {
    batchPutRequest.push({
      PutRequest: {
        Item: value
      }
    })
  });

  const documentClient = new AWS.DynamoDB.DocumentClient();
  await documentClient.batchWrite({
    RequestItems: {
      ["some"]: batchPutRequest,
    }
  }).promise();
}

export type dynamoDbData = Record<
  string,
  {
    uid?: string | undefined;
    full_name: string | undefined;
    profile_photo: string | undefined;
    dates: Array<{
      startDate: string | undefined;
      endDate: string | undefined
    }>
  }
>;
