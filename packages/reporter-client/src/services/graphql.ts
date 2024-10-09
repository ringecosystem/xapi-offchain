import {Service} from 'typedi';

export interface GraphqlQuery {
  endpoint: string
}

export interface ReporterRequired {
  quorum: number
  threshold: number
}

export interface RequestMade {
  requestId: bigint
  aggregator: string
  requestData: string
  requester: string
}

abstract class AbstractGraphqlService {
  abstract queryRequestMade(query: GraphqlQuery): Promise<RequestMade[]>;
}

@Service()
export class GraphqlService extends AbstractGraphqlService {

  private readonly thegraph: ThegraphService = new ThegraphService();

  async queryRequestMade(query: GraphqlQuery): Promise<RequestMade[]> {
    return this.thegraph.queryRequestMade(query);
  }
}

class ThegraphService extends AbstractGraphqlService {
  async queryRequestMade(query: GraphqlQuery): Promise<RequestMade[]> {
    return [];
  }
}
