import { Service } from "typedi";
import { setTimeout } from "timers/promises";
import { EvmGraphqlService, NearGraphqlService } from "../services/graphql";
import * as nearAPI from "near-api-js";

import {
  logger,
  XAPIConfig,
  NearI,
  NearW,
  ReporterRequired,
  XAPIResponse,
  TopStaked,
} from "@ringdao/xapi-common";
import { HelixChainConf } from "@helixbridge/helixconf";

export interface BaseStartOptions {}

export interface StartOptions extends BaseStartOptions {
  targetChains: HelixChainConf[];
}

export interface ReporterLifecycle extends StartOptions {
  near: NearI;
  targetChain: HelixChainConf;
}

@Service()
export class XAPIExporterStarter {
  private _nearInstance: Record<string, NearI> = {};
  private _aggregatorStakingMap: Record<string, string> = {};

  constructor(
    private evmGraphqlService: EvmGraphqlService,
    private nearGraphqlService: NearGraphqlService,
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

  async start(options: StartOptions) {
    try {
      while (true) {
        for (const chain of options.targetChains) {
          try {
            const near = await this.near(options, chain);
            logger.info(`==== start reporter for ${chain.code} ====`, {
              target: "reporter",
            });
            await this.run({
              ...options,
              near,
              targetChain: chain,
            });
          } catch (e: any) {
            logger.error(`run reporter errored: ${e.stack || e}`, {
              target: "reporter",
            });
          }
        }
        await setTimeout(1000);
      }
    } catch (e: any) {
      logger.error(`failed to start reporter: ${e.stack || e}`, {
        target: "reporter",
      });
    }
  }

  private async _stakingContract(
    lifecycle: ReporterLifecycle,
    aggeratorContractId: string,
  ): Promise<nearAPI.Contract> {
    const { near } = lifecycle;
    const scid = this._aggregatorStakingMap[aggeratorContractId];
    if (scid) {
      return near.contractStaking(scid);
    }
    const contract = near.contractAggregator(aggeratorContractId);
    // @ts-ignore
    const stakingContract: string = await contract.get_staking_contract();
    this._aggregatorStakingMap[aggeratorContractId] = stakingContract;
    return near.contractStaking(stakingContract);
  }

  private async run(lifecycle: ReporterLifecycle) {
    const { near, targetChain } = lifecycle;
    const waites = await this.evmGraphqlService.queryTodoRequestMade({
      endpoint: XAPIConfig.graphql.endpoint(targetChain.code),
    });
    const aggregatedEvents =
      await this.nearGraphqlService.queryAggregatedeEvents({
        endpoint: XAPIConfig.graphql.endpoint('near'),
        ids: waites.map((item) => item.requestId),
      });

    const possibleTodos = waites.filter(
      (wait) =>
        !aggregatedEvents.find((agg) => agg.request_id === wait.requestId),
    );

    const ag = near.contractAggregator('ormpaggregator.guantong.testnet');
    // @ts-ignore
    const reporterRequired: ReporterRequired = await ag.get_reporter_required();
    console.log("------>", reporterRequired);

    const sc = await this._stakingContract(lifecycle, 'ormpaggregator.guantong.testnet');
    // @ts-ignore
    const topStaked: TopStaked = await sc.get_top_staked({top: reporterRequired.quorum});
    console.log("------>", topStaked);


    // const reporterRequired: Record<string, any> = {};
    // for (const todo of possibleTodos) {
    //   if (reporterRequired[todo.aggregator]) continue;
    //   reporterRequired[todo.aggregator] = {

    //   };
    // }

    const todos = [];
    for (const todo of possibleTodos) {
      const aggeregator = near.contractAggregator(todo.aggregator);
      // @ts-ignore
      const response: XAPIResponse = await aggeregator.get_response({
        request_id: todo.requestId,
      });
      // if (response.status !== "FETCHING") continue;
      // todos.push(todo);
    }
    // console.log(todos);

    logger.debug(lifecycle.targetChain.code, {
      target: "reporter",
      breads: ["hello", "x"],
    });
  }
}
