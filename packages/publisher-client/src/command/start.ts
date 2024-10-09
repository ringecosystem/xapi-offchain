import { Service } from 'typedi';
import { setTimeout } from "timers/promises";
import { GraphqlService } from "../services/graphql";
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { Address } from '@ethereumjs/util';
import { Ethereum } from '../near-lib/ethereum';
import { Common } from '@ethereumjs/common';

export interface StartOptions {

}

@Service()
export class PublisherStarter {

    constructor(
        private graphqlService: GraphqlService,
    ) {
        this.graphqlService = new GraphqlService()
    }

    async start(options: StartOptions) {
        const publishEvents = await this.graphqlService.queryPublishEvent();
        const first = publishEvents[0];

        const transaction = FeeMarketEIP1559Transaction.fromTxData({
            nonce: BigInt(first.nonce),
            gasLimit: BigInt(first.gas_limit),
            maxFeePerGas: BigInt(first.max_fee_per_gas),
            maxPriorityFeePerGas: BigInt(first.max_priority_fee_per_gas),
            to: Address.fromString(first.chain_config.xapi_address),
            data: first.response.call_data as any,
            value: 0,
        }, { common: new Common({ chain: 11155111 }) })

        console.log("### transaction", transaction);

        const nearEth = new Ethereum("https://rpc.sepolia.org", '11155111');
        const signatureData = first.signature;
        const signedTransaction = await nearEth.reconstructSignature({ affine_point: signatureData.big_r_affine_point }, { scalar: signatureData.s_scalar }, signatureData.recovery_id, transaction);
        console.log("### signedTransaction", signedTransaction);

        // const txHash = await nearEth.relayTransaction(signedTransaction);
        // console.log("### relayTx", txHash);

        // console.log(first, new Date());
        // await setTimeout(1000);
    }
}