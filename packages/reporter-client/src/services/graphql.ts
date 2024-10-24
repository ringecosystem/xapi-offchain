import { Service } from "typedi";

import {
  XAPIResponse,
  RequestMade,
  BasicGraphqlParams,
  QueryWithIds,
  AbstractGraphqlService,
  Aggregator,
} from "@ringdao/xapi-common";
import chalk = require("chalk");

export interface XAPIResponseParams extends QueryWithIds {
  status?: string[];
}

@Service()
export class EvmGraphqlService extends AbstractGraphqlService {
  async queryTodoRequestMade(
    params: BasicGraphqlParams,
  ): Promise<RequestMade[]> {
    const query = `
    query QueryTodoRequestMades {
      requestMades(
        where: {fulfilled: 0},
        orderBy: id,
        orderDirection: asc,
        first: 50
      ) {
        id
        requestId
        aggregator
        requestData
        requester
        blockNumber
        blockTimestamp
        transactionHash
        fulfilled

        blockTimestamp
        blockNumber
      }
    }
    `;
    const data = await super.post({
      ...params,
      query,
    });
    return data["requestMades"];
  }
}

@Service()
export class NearGraphqlService extends AbstractGraphqlService {
  async queryAggregatedeEvents(params: QueryWithIds): Promise<XAPIResponse[]> {
    const query = `
    query QueryAggregatedEvents(
      ${params.ids ? "$ids: [String]" : ""}
    ) {
      aggregatedEvents(
        where: {
          ${params.ids ? "request_id_in: $ids" : ""}
        }
      ) {
        valid_reporters
        updated_at
        status
        started_at
        result
        request_id
        reporter_reward_addresses
        id
        chain_id
      }
    }
    `;
    const data = await super.post({
      ...params,
      query,
      variables: {
        ids: params.ids,
      },
    });
    return data["aggregatedEvents"];
  }

  async queryAggregators(params: BasicGraphqlParams): Promise<Aggregator[]> {
    const query = `
    query QueryAggregators($first: Int!, $skip: Int!) {
      aggregators(first: $first, skip: $skip) {
        supported_chains
        id
      }
    }
    `;
    const first = 100;
    let skip = 0;
    const aggregators: Aggregator[] = [];
    while (true) {
      const data = await super.post({
        ...params,
        query,
        variables: {
          first,
          skip,
        },
      });
      const pd = data["aggregators"];
      if (!pd || !pd.length) break;
      aggregators.push(...pd);
      skip = skip + first;
    }
    return aggregators;
  }
}
