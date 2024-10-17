import { Service } from "typedi";
import { setTimeout } from "timers/promises";
import { EvmGraphqlService, NearGraphqlService } from "../services/graphql";
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import { Address } from "@ethereumjs/util";
import { NearEthereum } from "../near-lib/ethereum";
import { Common } from "@ethereumjs/common";
import {
  logger,
  XAPIConfig,
  NearI,
  NearW,
  MpcOptions,
  XAPIResponse,
  Signature,
  PublishChainConfig,
  RequestMade,
} from "@ringdao/xapi-common";
import { HelixChainConf } from "@helixbridge/helixconf";

const xapiRequestsAbi = require('../abis/xapi-requests.abi.json');

export interface StartOptions {
  targetChains: HelixChainConf[];
}

export interface PublisherLifecycle extends StartOptions {
  near: NearI;
  targetChain: HelixChainConf;
  nearEthereum: NearEthereum;
}

@Service()
export class PublisherStarter {
  private _nearInstance: Record<string, NearI> = {};

  constructor(
    private readonly evmGraphqlService: EvmGraphqlService,
    private readonly nearGraphqlService: NearGraphqlService,
  ) {}

  private async near(
    options: StartOptions,
    chain: HelixChainConf,
  ): Promise<NearI> {
    const networkId = chain.testnet ? "testnet" : "mainnet";
    const cachedNear = this._nearInstance[networkId];
    if (cachedNear) return cachedNear;

    const nw = new NearW();
    const near = await nw.init({
      networkId,
      account: {
        privateKey:
          "secp256k1:by8kdJoJHu7uUkKfoaLd2J2Dp1q1TigeWMG123pHdu9UREqPcshCM223kWadm",
        accountId: "example-account",
      },
    });
    this._nearInstance[networkId] = near;
    return near;
  }

  private nearEthereumMap: Record<string, NearEthereum> = {};

  async start(options: StartOptions) {
    while (true) {
      if (options.targetChains.length == 0) {
        logger.info(`!!! NO CHAIN, OVER ====`, {
          target: "publisher",
        });
        return;
      }
      for (const chain of options.targetChains) {
        const near = await this.near(options, chain);
        const nearEthereum = this.getNearEthClient(chain);
        try {
          logger.info(`==== start publisher for ${chain.code} ====`, {
            target: "publisher",
          });
          await this.runPublisher({
            ...options,
            near,
            targetChain: chain,
            nearEthereum,
          });
          await setTimeout(1000);
        } catch (e: any) {
          logger.error(`run publisher errored: ${e.stack || e}`, {
            target: "publisher",
          });
        }
        try {
          logger.info(`==== start config-syncer for ${chain.code} ====`, {
            target: "config-syncer",
          });
          await this.runConfigSyncer({
            ...options,
            near,
            targetChain: chain,
            nearEthereum,
          });
          await setTimeout(1000);
        } catch (e: any) {
          logger.error(`run ConfigSyncer errored: ${e.stack || e}`, {
            target: "config-syncer",
          });
        }
        await setTimeout(1000);
      }
    }
  }

  async runPublisher(lifecycle: PublisherLifecycle) {
    const { near, targetChain } = lifecycle;
    console.log("=========>", this.evmGraphqlService);
    // 1. Fetch !fulfilled reqeust ids
    const nonfulfilled = await this.evmGraphqlService.queryTodoRequestMade({
      endpoint: XAPIConfig.graphql.endpoint(targetChain.code),
    });
    // 2. Fetch aggregated events for nonfulfilled requests
    const aggregatedEvents =
      await this.nearGraphqlService.queryAggregatedeEvents({
        endpoint: XAPIConfig.graphql.endpoint("near"),
        ids: nonfulfilled.map((item) => item.requestId),
      });
    const toPublishIds = aggregatedEvents.map((a) => a.request_id);
    logger.info(
      `==> [${targetChain.name}-${targetChain.code}] toPublishIds: ${toPublishIds}`,
      {
        target: "publisher",
      },
    );
    // 3. Check request status on xapi contract
    for (const aggregated of aggregatedEvents) {
      const relatedRequest = nonfulfilled.find(
        (v) => v.requestId == aggregated.request_id,
      );
      const _request = await lifecycle.nearEthereum.getContractViewFunction(
        relatedRequest!.xapiAddress,
        [xapiRequestsAbi],
        "requests",
        [relatedRequest!.requestId],
      );
      logger.info(
        `==> [${targetChain.name}-${targetChain.code}] double check ${relatedRequest?.requestId}, status: ${_request.status}`,
        {
          target: "publisher",
        },
      );
      if (_request.stauts == 0) {
        // 4. if status is pending, triggerPublish
        logger.info(`==> [${relatedRequest?.requestId}] triggerPublish`, {
          target: "publisher",
        });
        // this.triggerPublish(aggregated, lifecycle);
        setTimeout(1000);
      }
    }
  }

  async runConfigSyncer(lifecycle: PublisherLifecycle) {
    // Fetch latest SetPublishChainConfigEvent from near indexer for chainid
    // Fetch AggregatorConfigSet event from evm indexer
    // if the version doesn't exist on target chain
    // Check chain config state on xapi contract
    // if version < this version triggerSyncConfig
    // if result, relayMpc
    // if timeout, wait and then relay
  }

  async triggerPublish(
    xapiResponse: XAPIResponse,
    lifecycle: PublisherLifecycle,
  ) {
    const chainId = xapiResponse.chain_id;

    // todo Fetch XAPI address from near chain config
    const xapiAddress = Address.fromString(
      "0x6984ebE378F8cb815546Cb68a98807C1fA121A81",
    );

    // todo Estimate gasLimit
    const gasLimit = 500000;

    // Derive address
    const deriveAddress = await this.deriveXAPIAddress(lifecycle);
    const nonce = await lifecycle.nearEthereum.getNonce(deriveAddress);
    const balance = await lifecycle.nearEthereum.getBalance(deriveAddress);
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await lifecycle.nearEthereum.queryGasPrice();

    // call Aggregator publish_external()
    xapiResponse.request_id,
      {
        mpc_options: {
          nonce,
          gas_limit: gasLimit,
          max_fee_per_gas: maxFeePerGas,
          max_priority_fee_per_gas: maxPriorityFeePerGas,
        },
      };
    // if published, relay
    // if timeout, wait and find published evnet and relay
  }

  async triggerSyncConfig(
    publishChainConfig: PublishChainConfig,
    lifecycle: PublisherLifecycle,
  ) {
    const chainId = publishChainConfig.chain_id;

    // todo Fetch XAPI address from near chain config
    const xapiAddress = Address.fromString(
      "0x6984ebE378F8cb815546Cb68a98807C1fA121A81",
    );

    // todo Estimate gasLimit
    const gasLimit = 500000;

    // Derive address
    const deriveAddress = await this.deriveXAPIAddress(lifecycle);
    const nonce = await lifecycle.nearEthereum.getNonce(deriveAddress);
    const balance = await lifecycle.nearEthereum.getBalance(deriveAddress);
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await lifecycle.nearEthereum.queryGasPrice();

    // call Aggregator sync_publish_config_to_remote()
    publishChainConfig.chain_id,
      {
        mpc_options: {
          nonce,
          gas_limit: gasLimit,
          max_fee_per_gas: maxFeePerGas,
          max_priority_fee_per_gas: maxPriorityFeePerGas,
        },
      };
  }

  async relayMpcTx(
    chainId: string,
    contract: Address,
    calldata: string,
    signature: Signature,
    mpcOptions: MpcOptions,
    lifecycle: PublisherLifecycle,
  ) {
    const transaction = FeeMarketEIP1559Transaction.fromTxData(
      {
        nonce: BigInt(mpcOptions.nonce),
        gasLimit: BigInt(mpcOptions.gas_limit),
        maxFeePerGas: BigInt(mpcOptions.max_fee_per_gas),
        maxPriorityFeePerGas: BigInt(mpcOptions.max_priority_fee_per_gas),
        to: contract,
        data: calldata as any,
        value: 0,
      },
      { common: new Common({ chain: chainId }) },
    );

    // console.log("### transaction", transaction);

    const signedTransaction = await lifecycle.nearEthereum.reconstructSignature(
      { affine_point: signature.big_r_affine_point },
      { scalar: signature.s_scalar },
      signature.recovery_id,
      transaction,
    );
    // console.log("### signedTransaction", signedTransaction);

    const txHash =
      await lifecycle.nearEthereum.relayTransaction(signedTransaction);
    console.log("### relayTx", txHash);
  }

  async deriveXAPIAddress(lifecycle: PublisherLifecycle) {
    return (
      await lifecycle.nearEthereum.deriveAddress(
        "ormpaggregator.guantong.testnet",
        `XAPI-${lifecycle.targetChain.code}`,
      )
    ).address;
  }

  getNearEthClient(chain: HelixChainConf): NearEthereum {
    const cachedNearEthereum = this.nearEthereumMap[chain.code];
    if (cachedNearEthereum) {
      return cachedNearEthereum;
    }
    const ne = new NearEthereum(chain.rpc, chain.code);
    this.nearEthereumMap[chain.code] = ne;
    return ne;
  }
}
