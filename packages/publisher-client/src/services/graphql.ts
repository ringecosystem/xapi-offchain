import { Service } from "typedi";
import {
  logger,
  Tools,
  BasicGraphqlParams,
  QueryWithIds,
  RequestMade,
  XAPIResponse,
  AbstractGraphqlService,
  Aggregator,
} from "@ringdao/xapi-common";

export interface QueryWithAggregator extends BasicGraphqlParams {
  aggregator: string,
}

@Service()
export class EvmGraphqlService extends AbstractGraphqlService {
  async queryTodoRequestMade(
    params: QueryWithAggregator,
  ): Promise<RequestMade[]> {
    const query = `
    query QueryTodoRequestMades(
      $aggregator: String,
    )
     {
      requestMades(
        where: {fulfilled: 0, aggregator: $aggregator},
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
        xapiAddress

        blockTimestamp
        blockNumber
      }
    }
    `;
    const data = await super.post({
      ...params,
      query,
      variables: {
        aggregator: params.aggregator
      }
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
        aggregator
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

  async queryAllAggregators(params: BasicGraphqlParams): Promise<Aggregator[]> {
    const query = `
    query AllAggregators {
      aggregators(first: 100) {
        id
        supported_chains
      }
    }
    `;
    const data = await super.post({
      ...params,
      query,
      variables: {},
    });
    return data["aggregators"];
  }
}
