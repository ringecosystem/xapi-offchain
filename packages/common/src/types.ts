export interface ReporterRequired {
  quorum: number
  threshold: number
}

export interface RequestMade {
  id: string
  requestId: string
  aggregator: string
  requestData: string
  requester: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  fulfilled: number
  xapiAddress: string
}

export interface XAPIResponse {
  valid_reporters: string[]
  updated_at: string
  status: string
  started_at: string
  result: string
  request_id: string
  id: string
  chain_id: string
  reporter_reward_addresses: string[]
  aggregator?: string
}

export interface TopStaked {
  account_id: string
  amount: string
}



export interface Signature {
  id: string
  big_r_affine_point: string
  recovery_id: number
  s_scalar: string
}

export interface PublishChainConfig {
  id: string
  chain_id: string
  xapi_address: string
  reporters_fee: string
  publish_fee: string
  reward_address: string
  version: string
  aggregator?: string
}



export interface PublishEvent {
  id: string
  request_id: string
  response: XAPIResponse
  publish_chain_config: PublishChainConfig
  signature: Signature
  call_data: string
  mpc_options: MpcOptions
  aggregator: string
}

export interface SyncPublishChainConfigEvent {
  id: string
  chain_id: string
  xapi_address: string
  version: string
  call_data: string
  signature: Signature
  mpc_options: MpcOptions
  publish_chain_config: PublishChainConfig
  aggregator: string
}

export interface MpcOptions {
  id: string
  nonce: string
  gas_limit: string
  max_fee_per_gas: string
  max_priority_fee_per_gas: string
}

export interface Aggregator {
  id: string
  supported_chains: string[]
}

