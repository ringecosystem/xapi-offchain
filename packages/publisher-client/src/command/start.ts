import Container, { Service } from 'typedi';
import { setTimeout } from "timers/promises";
import { EvmGraphqlService, NearGraphqlService } from "../services/graphql";
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { Address } from '@ethereumjs/util';
import { NearEthereum } from '../near-lib/ethereum';
import { Common } from '@ethereumjs/common';
import {
    logger,
    XAPIConfig,
    NearI,
    NearW,
    MpcOptions, XAPIResponse, Signature, PublishChainConfig, RequestMade
} from "@ringdao/xapi-common";
import { HelixChain, HelixChainConf } from "@helixbridge/helixconf";

import xapiAbi from "../abis/xapi.abi.json";
import { assert } from 'console';
import { Account as NearAccount } from 'near-api-js';
import { KeyPairString } from "near-api-js/lib/utils";

export interface StartOptions {
    nearAccount: string,
    nearPrivateKey: KeyPairString,
    targetChains: HelixChainConf[];
}

export interface PublisherLifecycle extends StartOptions {
    near: NearI;
    targetChain: HelixChainConf;
    nearEthereum: NearEthereum;
    aggregator: string;
}

@Service()
export class PublisherStarter {
    private _nearInstance: Record<string, NearI> = {};

    constructor(
        private evmGraphqlService: EvmGraphqlService,
        private nearGraphqlService: NearGraphqlService
    ) {
    }

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
                    options.nearPrivateKey,
                accountId: options.nearAccount,
            },
        });
        this._nearInstance[networkId] = near;
        return near;
    }

    private nearEthereumMap: Record<string, NearEthereum> = {};

    async start(options: StartOptions) {
        while (true) {
            const allAggregators = await this.nearGraphqlService.queryAllAggregators({
                endpoint: XAPIConfig.graphql.endpoint('near'),
            });
            console.log("allAggregators", allAggregators);
            if (!allAggregators || allAggregators.length == 0) {
                logger.info(`==== No aggregators, wait 60 seconds to continue ====`, {
                    target: "main",
                });
                await setTimeout(60000);
                continue;
            }
            for (const aggregator of allAggregators) {
                for (const chainId of aggregator.supported_chains) {
                    const chain = HelixChain.get(chainId);
                    if (!chain) {
                        logger.error(`Can't find chain: ${chainId}`, {
                            target: "start"
                        });
                        continue;
                    }
                    const near = await this.near(options, chain);
                    const nearEthereum = this.getNearEthClient(chain);

                    try {
                        logger.info(`==== start publisher for [${chain.name}-${chain.id.toString()}] ====`, {
                            target: "publisher",
                        });
                        await this.runPublisher({ ...options, near, targetChain: chain, nearEthereum, aggregator: aggregator.id });
                        await setTimeout(1000);
                    } catch (e: any) {
                        logger.error(`run publisher errored: ${e.stack || e}`, {
                            target: "publisher",
                        });
                    }

                    try {
                        logger.info(`==== start config-syncer for [${chain.name}-${chain.id.toString()}] ====`, {
                            target: "config-syncer",
                        });
                        await this.runConfigSyncer({ ...options, near, targetChain: chain, nearEthereum, aggregator: aggregator.id });
                        await setTimeout(1000);
                    } catch (e: any) {
                        logger.error(`run ConfigSyncer errored: ${e.stack || e}`, {
                            target: "config-syncer",
                        });
                    }
                    await setTimeout(1000);
                    return;
                }
            }
        }
    }

    async runPublisher(lifecycle: PublisherLifecycle) {
        const { near, targetChain } = lifecycle;
        // 1. Fetch !fulfilled reqeust ids
        const nonfulfilled = await this.evmGraphqlService.queryTodoRequestMade({
            endpoint: XAPIConfig.graphql.endpoint(targetChain.code),
            aggregator: lifecycle.aggregator
        });
        // 2. Fetch aggregated events for nonfulfilled requests
        const aggregatedEvents =
            await this.nearGraphqlService.queryAggregatedeEvents({
                endpoint: XAPIConfig.graphql.endpoint('near'),
                ids: nonfulfilled.map((item) => item.requestId),
            });
        const toPublishIds = aggregatedEvents.map(a => a.request_id);
        logger.info(`### ==> Handle ${lifecycle.aggregator} [${targetChain.name}-${targetChain.id.toString()}] toPublishIds: [${toPublishIds.length}], ${toPublishIds}`, {
            target: "publisher",
        });
        // 3. Check request status on xapi contract
        for (const aggregated of aggregatedEvents) {
            const relatedRequest = nonfulfilled.find(v => v.requestId == aggregated.request_id);
            const _request = await lifecycle.nearEthereum.getContractViewFunction(relatedRequest!.xapiAddress, xapiAbi, "requests", [relatedRequest!.requestId]);
            logger.info(`==> [${targetChain.name}-${targetChain.id.toString()}] double check ${relatedRequest?.requestId}, status: ${_request.status}`, {
                target: "publisher",
            });
            if (_request.status == 0) {
                // 4. if status is pending, triggerPublish
                logger.info(`==> [${relatedRequest?.requestId}] triggerPublish`, {
                    target: "publisher"
                })
                await this.triggerPublish(aggregated, relatedRequest!, lifecycle);
                setTimeout(3000);
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

    async triggerPublish(aggregated: XAPIResponse, relatedRequest: RequestMade, lifecycle: PublisherLifecycle) {
        // Derive address
        const deriveAddress = await this.deriveXAPIAddress(aggregated.aggregator!, lifecycle);
        logger.info(`===> deriveAddress: ${deriveAddress}`, {
            target: "triggerPublish",
        });
        // console.log("estimate", relatedRequest.xapiAddress, relatedRequest.requestId, aggregated.valid_reporters, aggregated.result)
        let gasLimit = await lifecycle.nearEthereum.estimateGas(relatedRequest.xapiAddress, xapiAbi, "fulfill",
            [relatedRequest.requestId, [aggregated.reporter_reward_addresses, lifecycle.nearEthereum.stringToBytes(aggregated.result)]],
            deriveAddress
        );
        if (gasLimit) {
            gasLimit = gasLimit * BigInt(3) / BigInt(2);
        } else {
            gasLimit = 500000;
        }
        logger.info(`===> gasLimit: ${gasLimit}`, {
            target: "triggerPublish",
        });
        const nonce = await lifecycle.nearEthereum.getNonce(deriveAddress);
        logger.info(`===> nonce: ${nonce}`, {
            target: "triggerPublish",
        });
        const balance = await lifecycle.nearEthereum.getBalance(deriveAddress);
        // todo check if fee is enough
        logger.info(`===> balance: ${balance}`, {
            target: "triggerPublish",
        });
        let { maxFeePerGas, maxPriorityFeePerGas } = await lifecycle.nearEthereum.queryGasPrice();
        maxFeePerGas = (BigInt(maxFeePerGas) * BigInt(3) / BigInt(2)).toString();
        maxPriorityFeePerGas = (BigInt(maxPriorityFeePerGas) * BigInt(3) / BigInt(2)).toString();
        logger.info(`===> maxFeePerGas: ${maxFeePerGas}, maxPriorityFeePerGas: ${maxPriorityFeePerGas}`, {
            target: "triggerPublish",
        });
        // call Aggregator publish_external()
        // @ts-ignore
        const result = await lifecycle.near.contractAggregator(aggregated.aggregator!).publish_external(
            {
                signerAccount: new NearAccount(lifecycle.near.near.connection, lifecycle.nearAccount),
                args: {
                    request_id: aggregated.request_id,
                    mpc_options: { nonce: nonce.toString(), gas_limit: gasLimit.toString(), max_fee_per_gas: maxFeePerGas.toString(), max_priority_fee_per_gas: maxPriorityFeePerGas.toString() }
                },
                gas: "300000000000000",
                // todo read from aggregator mpc config
                amount: "1000000000000000000000000"
            }
        );
        console.log("publish result", result);
        // todo if published, relay
        if (result && result.signature) {
            const _signature = JSON.parse(result.signature);
            try {
                await this.relayMpcTx(result.response.chain_id, result.chain_config.xapi_address, result.call_data, {
                    id: "0",
                    big_r_affine_point: _signature.big_r.affine_point,
                    s_scalar: _signature.s.scalar,
                    recovery_id: 0
                }, result.mpc_options, lifecycle);
            } catch (e) {
                console.log(e);
                // @ts-ignore
                console.log(e.reason);
            }
        }
        // todo handle exeeded the prepaid gas error:   2024-10-18T07:01:57Z | [  publisher   ] run publisher errored: Error: {"index":0,"kind":{"index":0,"kind":{"FunctionCallError":{"ExecutionError":"Exceeded the prepaid gas."}}}}
        // todo if timeout, wait and find published evnet and relay
    }

    async triggerSyncConfig(publishChainConfig: PublishChainConfig, lifecycle: PublisherLifecycle) {
        const chainId = publishChainConfig.chain_id;

        // todo Fetch XAPI address from near chain config
        const xapiAddress = Address.fromString("0x6984ebE378F8cb815546Cb68a98807C1fA121A81");

        // todo Estimate gasLimit
        const gasLimit = 500000;

        // Derive address
        const deriveAddress = await this.deriveXAPIAddress(publishChainConfig.aggregator!, lifecycle);
        const nonce = await lifecycle.nearEthereum.getNonce(deriveAddress);
        const balance = await lifecycle.nearEthereum.getBalance(deriveAddress);
        const { maxFeePerGas, maxPriorityFeePerGas } = await lifecycle.nearEthereum.queryGasPrice();

        // call Aggregator sync_publish_config_to_remote()
        (publishChainConfig.chain_id, { mpc_options: { nonce, gas_limit: gasLimit, max_fee_per_gas: maxFeePerGas, max_priority_fee_per_gas: maxPriorityFeePerGas } });
    }

    async relayMpcTx(chainId: string, contract: Address, calldata: string, signature: Signature, mpcOptions: MpcOptions, lifecycle: PublisherLifecycle) {
        const transaction = FeeMarketEIP1559Transaction.fromTxData({
            nonce: BigInt(mpcOptions.nonce),
            gasLimit: BigInt(mpcOptions.gas_limit),
            maxFeePerGas: BigInt(mpcOptions.max_fee_per_gas),
            maxPriorityFeePerGas: BigInt(mpcOptions.max_priority_fee_per_gas),
            to: contract,
            data: calldata as any,
            value: 0,
        }, { common: new Common({ chain: BigInt(chainId) }) })

        // console.log("### transaction", transaction);

        const signedTransaction = await lifecycle.nearEthereum.reconstructSignature({ affine_point: signature.big_r_affine_point }, { scalar: signature.s_scalar }, signature.recovery_id, transaction);
        // console.log("### signedTransaction", signedTransaction);

        const txHash = await lifecycle.nearEthereum.relayTransaction(signedTransaction);
        console.log("### relayTx", txHash);
    }

    async deriveXAPIAddress(aggregator: string, lifecycle: PublisherLifecycle) {
        assert(aggregator != undefined, "Derive aggregator is ", aggregator);
        return (await lifecycle.nearEthereum.deriveAddress(aggregator, `XAPI-${lifecycle.targetChain.id.toString()}`)).address;
    }

    getNearEthClient(chain: HelixChainConf): NearEthereum {
        const cachedNearEthereum = this.nearEthereumMap[chain.id.toString()];
        if (cachedNearEthereum) {
            return cachedNearEthereum;
        }
        const ne = new NearEthereum(chain.rpc, chain.id.toString());
        this.nearEthereumMap[chain.id.toString()] = ne;
        return ne;
    }
}