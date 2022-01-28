import axios, { AxiosResponse } from 'axios';
import PTO from '../models/PTO';

export default class PTOsFetcher {
  fromDate!: string;

  toDate!: string;

  token!: string | undefined;

  constructor(fromDate: string, toDate: string, token: string | undefined) {
    this.fromDate = fromDate;
    this.toDate = toDate;
    this.token = token;
  }

  async fetch(): Promise<Array<PTO>> {
    const ptosContent = await this.queryCollection();
    const { blockIds } =
      ptosContent.data.result.reducerResults.calendar_results;
    const ptos: PTO[] = [];
    blockIds.forEach((blockId: string) => {
      const blockProps =
        ptosContent.data.recordMap.block[blockId].value.properties;
      const dates = blockProps['2`kt'][0][1][0][1];
      blockProps['s.DD'].forEach((blockUser: string) => {
        if (blockUser.length === 1) {
          return;
        }
        ptos.push({
          startDate: dates.start_date,
          endDate: dates.end_date || dates.start_date,
          uid: blockUser[1][0][1],
        });
      });
    });
    return ptos;
  }

  private async queryCollection(): Promise<AxiosResponse> {
    const calendarQueryBody = {
      collection: {
        id: '1a3c17b7-1897-471d-96b0-7ed7c6548d46',
        spaceId: 'c4882ad3-57cd-492b-a5c0-ca55f47745b5',
      },
      collectionView: {
        id: '69b269d1-67a0-4e1e-9a24-e978e93ae065',
        spaceId: 'c4882ad3-57cd-492b-a5c0-ca55f47745b5',
      },
      loader: {
        type: 'reducer',
        reducers: {
          calendar_results: {
            type: 'results',
            filter: {
              operator: 'and',
              filters: [
                {
                  property: '2`kt',
                  filter: {
                    operator: 'date_is_on_or_after',
                    use_end: true,
                    value: {
                      type: 'exact',
                      value: {
                        type: 'date',
                        start_date: this.fromDate,
                      },
                    },
                  },
                },
                {
                  property: '2`kt',
                  filter: {
                    operator: 'date_is_on_or_before',
                    value: {
                      type: 'exact',
                      value: {
                        type: 'date',
                        start_date: this.toDate,
                      },
                    },
                  },
                },
              ],
            },
            limit: 5000,
          },
        },
        searchQuery: '',
        userTimeZone: 'Europe/Warsaw',
      },
    };

    return axios('https://www.notion.so/api/v3/queryCollection', {
      method: 'POST',
      data: JSON.stringify(calendarQueryBody),
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token_v2=${this.token};`,
      },
    });
  }
}
