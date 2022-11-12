import * as dotenv from 'dotenv';
import AWS from 'aws-sdk';
import todayPlus from './helpers/time';

dotenv.config();

AWS.config.update({ region: 'eu-central-1' });

export const lambdaHandler = async () => {
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const items = await documentClient
    .scan({
      TableName: process.env.TABLE_NAME,
    })
    .promise();

  const widgetData: Record<
    string,
    Record<
      string,
      { full_name: string | undefined; profile_photo: string | undefined }
    >
  > = {};

  const metaItem = items.Items.find(item => item.uid === 'meta');

  [0, 1, 2, 3].forEach((daysFromToday: number) => {
    const date = todayPlus(daysFromToday);
    widgetData[date] ??= {};

    items.Items.forEach((item) => {
      if (item.last_updated_at >= metaItem.last_updated_at) {
        item.dates?.forEach((ptoDates) => {
          if (
            ptoDates.startDate === date || ptoDates.endDate === date ||
            (ptoDates.startDate < date && ptoDates.endDate > date)
          ) {
            widgetData[date][item.uid] = {
              full_name: item.full_name,
              profile_photo: item.profile_photo,
            };
          }
        });
      }
    });
  });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(widgetData),
  };
};

lambdaHandler();
