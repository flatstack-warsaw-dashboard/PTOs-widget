import PTOsFetcher from './fetchers/PTOsFetcher';
import UsersFetcher from './fetchers/UsersFetcher';
import PTO from './models/PTO';
import User from './models/User';
import * as dotenv from 'dotenv';

dotenv.config();

export const TOKEN = process.env.NOTION_TOKEN;

export const lambdaHandler = async () => {

  const today = todayPlus(1);
  const todayPlusThreeDays = todayPlus(4);

  const ptosFetcher = new PTOsFetcher(
    today,
    todayPlusThreeDays,
    TOKEN,
  );
  const ptos = await ptosFetcher.fetch();

  const usersFetcher = new UsersFetcher(
    ptos.map((pto) => pto.uid),
    TOKEN,
  );
  const users = await usersFetcher.fetch();

  const widgetData:
    Record<string, Record<string, { full_name: string | undefined, profile_photo: string | undefined }>> = {};
  [todayPlus(1), todayPlus(2), todayPlus(3), todayPlus(4)].forEach((date: string) => {
    widgetData[date] = {};
    ptos.forEach((pto: PTO) => {
      if (pto.startDate == date || pto.endDate == date || (pto.startDate < date && pto.endDate > date)) {
        const user = users.find((user: User) => { return user.uid == pto.uid })
        widgetData[date][pto.uid] = {
          full_name: user?.full_name,
          profile_photo: user?.profile_photo
        }
      }
    });
  });
  console.log(widgetData)
}

export function todayPlus(plus: number): string {
  const today = new Date();
  return new Date(
    today.getFullYear(), today.getMonth(), today.getDate() + plus
  ).toISOString().slice(0, 10);
}

lambdaHandler();
