import * as nearAPI from "near-api-js";
import {
  JsonRpcProvider,
  FailoverRpcProvider,
} from "near-api-js/lib/providers";
import { ContractMethods } from "near-api-js/lib/contract";
import { KeyPairString } from "near-api-js/lib/utils";

export interface NearContractOptions {
  contractId: string;
  options: ContractMethods;
}

export interface NearInitOptions {
  networkId: "mainnet" | "testnet";
  account: NearIdentify;
}

export interface NearIdentify {
  privateKey: KeyPairString;
  accountId: string;
}


export class NearW {
  private async nearConfig(
    options: NearInitOptions,
  ): Promise<nearAPI.ConnectConfig> {
    const { keyStores, KeyPair } = nearAPI;
    const myKeyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(options.account.privateKey);
    await myKeyStore.setKey(
      options.networkId,
      options.account.accountId,
      keyPair,
    );

    switch (options.networkId) {
      case "mainnet": {
        const jsonProviders = [
          new JsonRpcProvider({
            url: "https://rpc.mainnet.near.org",
          }),
          new JsonRpcProvider({
            url: "https://rpc.mainnet.pagoda.co",
          }),
          new JsonRpcProvider({
            url: "https://near.lava.build",
          }),
        ];
        const provider = new FailoverRpcProvider(jsonProviders);
        return {
          networkId: "mainnet",
          provider: provider,
          keyStore: myKeyStore,
          nodeUrl: "https://rpc.mainnet.near.org",
          walletUrl: "https://wallet.mainnet.near.org",
          helperUrl: "https://helper.mainnet.near.org",
        };
      }
      case "testnet": {
        const jsonProviders = [
          new JsonRpcProvider({
            url: "https://rpc.testnet.near.org",
          }),
        ];
        const provider = new FailoverRpcProvider(jsonProviders);
        return {
          networkId: "testnet",
          provider: provider,
          keyStore: myKeyStore,
          nodeUrl: "https://rpc.testnet.near.org",
          walletUrl: "https://wallet.testnet.near.org",
          helperUrl: "https://helper.testnet.near.org",
        };
      }
    }
  }

  public async init(options: NearInitOptions): Promise<NearI> {
    const config = await this.nearConfig(options);
    const nearConnection = await nearAPI.connect(config);
    return new NearI(nearConnection);
  }
}

export class NearI {
  private walletConnection: nearAPI.WalletConnection | undefined;
  private contractMap: Record<string, nearAPI.Contract> = {};

  constructor(private readonly _near: nearAPI.Near) {}

  get near(): nearAPI.Near {
    return this._near;
  }

  get wallet(): nearAPI.WalletConnection {
    if (this.walletConnection) return this.walletConnection;
    this.walletConnection = new nearAPI.WalletConnection(this._near, "xapi");
    return this.walletConnection;
  }

  public contract(contractId: string, options: ContractMethods): nearAPI.Contract {
    const cachedContract = this.contractMap[contractId];
    if (cachedContract) {
      return cachedContract;
    }
    const c = new nearAPI.Contract(
      this._near.connection,
      contractId,
      options,
    );
    this.contractMap[contractId] = c;
    return c;
  }

  public contractAggregator(contractId: string): nearAPI.Contract {
    return this.contract(contractId, {
      viewMethods: [
        'get_response',
        'get_reporter_required',
        'get_staking_contract',
      ],
      changeMethods: [],
      useLocalViewExecution: false,
    });
  }

  public contractStaking(contractId: string): nearAPI.Contract {
    return this.contract(contractId, {
      viewMethods: [
        'get_top_staked'
      ],
      changeMethods: [],
      useLocalViewExecution: false,
    });
  }

}
