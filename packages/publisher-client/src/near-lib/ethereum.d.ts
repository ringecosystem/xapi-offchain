// src/near-lib/ethereum.d.ts
export class Ethereum {
    constructor(chain_rpc: string, chain_id: string);
    deriveAddress(accountId: string, derivation_path: string): Promise<{ publicKey: Buffer; address: string }>;
    queryGasPrice(): Promise<{ maxFeePerGas: string; maxPriorityFeePerGas: string }>;
    getBalance(accountId: string): Promise<string>;
    getContractViewFunction(receiver: string, abi: any, methodName: string, args?: any[]): Promise<any>;
    createTransactionData(receiver: string, abi: any, methodName: string, args?: any[]): any;
    createPayload(sender: string, receiver: string, amount: string, data: any): Promise<{ transaction: any; payload: any }>;
    requestSignatureToMPC(wallet: any, contractId: string, path: string, ethPayload: any): Promise<{ big_r: any; s: any; recovery_id: any }>;
    reconstructSignature(big_r: any, S: any, recovery_id: any, transaction: any): Promise<any>;
    relayTransaction(signedTransaction: any): Promise<string>;
}