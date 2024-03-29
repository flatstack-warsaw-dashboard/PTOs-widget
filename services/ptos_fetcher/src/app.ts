import * as dotenv from 'dotenv';
import AWS from 'aws-sdk';
import * as dynamoDbHelper from './helpers/dynamodb';
import { dynamoDbData } from './helpers/dynamodb';
import PTOsFetcher from './fetchers/PTOsFetcher';
import UsersFetcher from './fetchers/UsersFetcher';
import PTO from './models/PTO';
import User from './models/User';
import todayPlus from './helpers/time';

dotenv.config();

export const TOKEN = process.env.NOTION_TOKEN;

AWS.config.update({ region: 'eu-central-1' });

export const lambdaHandler = async () => {
  const today = todayPlus(0);
  const todayPlusThreeDays = todayPlus(3);

  const ptosFetcher = new PTOsFetcher(today, todayPlusThreeDays, TOKEN);
  const ptos = await ptosFetcher.fetch();

  const usersFetcher = new UsersFetcher(
    ptos.map((pto) => pto.uid),
    TOKEN
  );
  const users = await usersFetcher.fetch();

  const lastUpdatedAt = Date.now().toString();
  const data: dynamoDbData = {
    'meta': { uid: 'meta', last_updated_at: lastUpdatedAt }
  };

  ptos.forEach((pto: PTO) => {
    const user = users.find((u: User) => u.uid === pto.uid);
    const { dates = [] } = data[pto.uid] || {};
    dates.push({
      startDate: pto.startDate,
      endDate: pto.endDate,
    });
    data[pto.uid] = {
      uid: user?.uid,
      full_name: user?.full_name,
      profile_photo: user?.profile_photo,
      last_updated_at: lastUpdatedAt,
      dates
    };
  });

  const dbUpdateRequest = await dynamoDbHelper.putRequest(data);
  console.log(JSON.stringify(dbUpdateRequest));
};

lambdaHandler();
