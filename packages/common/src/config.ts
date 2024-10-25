
export interface XAPIConfigType {
  graphql: {
    endpoint: (chain: string) => string,
  },
  minimumRewards: Record<string, bigint>,
};

const graphqlEndpoint: Record<string, string> = {
  _fallback: 'https://thegraph.darwinia.network/dip7/subgraphs/name/dip7index-crab',
  near: 'https://api.studio.thegraph.com/query/66211/xapi-near/version/latest',
  sepolia: 'https://api.studio.thegraph.com/query/51152/txapi-sepolia/version/latest',
  // 'darwinia-dvm': 'https://thegraph.darwinia.network/dip7/subgraphs/name/darwinia',
  // 'crab-dvm': 'https://thegraph.darwinia.network/dip7/subgraphs/name/crab',
};

const minimumRewards: Record<string, bigint> = {
  sepolia: 12000000000000n, // $0.03
};

export const XAPIConfig: XAPIConfigType = {
  graphql: {
    endpoint(chain: string): string {
      return graphqlEndpoint[chain] ?? graphqlEndpoint._fallback;
    }
  },
  minimumRewards,
};

