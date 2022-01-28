import axios, { AxiosResponse } from 'axios';
import User from '../models/User';

export default class UsersFetcher {
  uids!: Array<string>;

  token!: string | undefined;

  constructor(uids: Array<string>, token: string | undefined) {
    this.uids = uids;
    this.token = token;
  }

  async fetch(): Promise<Array<User>> {
    const usersContent = await this.syncRecordValues();
    return this.uids.map((uid: string) => ({
      uid,
      email: usersContent.data.recordMap.notion_user[uid].value.email,
      name: usersContent.data.recordMap.notion_user[uid].value.given_name,
      surname: usersContent.data.recordMap.notion_user[uid].value.family_name,
      full_name: usersContent.data.recordMap.notion_user[uid].value.name,
      profile_photo:
        usersContent.data.recordMap.notion_user[uid].value.profile_photo,
    }));
  }

  private async syncRecordValues(): Promise<AxiosResponse> {
    return axios('https://www.notion.so/api/v3/syncRecordValues', {
      method: 'POST',
      data: JSON.stringify({
        requests: this.uids.map((todayPtoUserId: string) => ({
          pointer: {
            table: 'notion_user',
            id: todayPtoUserId,
          },
          version: -1,
        })),
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token_v2=${this.token};`,
      },
    });
  }
}
