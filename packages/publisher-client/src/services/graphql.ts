import axios from 'axios';
import { Service } from 'typedi';

export interface Response {
    id: string
    request_id: string
    valid_reporters: string[]
    reporter_reward_addresses: string[]
    started_at: string
    updated_at: string
    status: string
    call_data: string
    result: string
    chain_id: string
}

export interface PublishChainConfig {
    id: string
    chain_id: string
    xapi_address: string
}

export interface Signature {
    id: string
    big_r_affine_point: string
    recovery_id: number
    s_scalar: string
}

export interface PublishEvent {
    id: string
    request_id: string
    response: Response
    chain_config: PublishChainConfig
    signature: Signature
    nonce: string
    gas_limit: string
    max_fee_per_gas: string
    max_priority_fee_per_gas: string
}

export interface AggregatedEvent {
    id: string
    request_id: string
    response: Response
}

abstract class AbstractGraphqlQuery {
    abstract queryPublishEvent(): Promise<PublishEvent[]>;
}

@Service()
export class GraphqlService extends AbstractGraphqlQuery {

    private readonly thegraph: ThegraphService = new ThegraphService();

    async queryPublishEvent(): Promise<PublishEvent[]> {
        return this.thegraph.queryPublishEvent();
    }
}

class ThegraphService extends AbstractGraphqlQuery {
    async queryPublishEvent(): Promise<PublishEvent[]> {
        const publishEvent = {
            "id": "1727698419001766784",
            "chain_config": {
                "chain_id": "0",
                "id": "1727698419001766784",
                "xapi_address": "0x9F33a4809aA708d7a399fedBa514e0A0d15EfA85"
            },
            "request_id": "6277101735386680763835789423207666416102355444464034512855",
            "response": {
                "call_data": "0xae0ba13a0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffd7",
                "chain_id": "0",
                "id": "1727698419001766784",
                "reporter_reward_addresses": [
                    "0x9f123456"
                ],
                "request_id": "6277101735386680763835789423207666416102355444464034512855",
                "result": "test-result",
                "started_at": "1727698382505495116",
                "status": "PUBLISHED",
                "updated_at": "1727698384582199258",
                "valid_reporters": [
                    "guantong.testnet"
                ]
            },
            "signature": {
                "big_r_affine_point": "02A9E29B167C1CBB48E996CD0BD9477A7B23BF4B18EACA14A5DA02E47956C33FC4",
                "id": "1727698419001766784",
                "recovery_id": 0,
                "s_scalar": "75733C4A46D28975DA4C20A8B18B987C6FF7833EB94818299BBEBF29D5B6A82E"
            },
            "nonce": "1",
            "max_fee_per_gas": "1000000",
            "max_priority_fee_per_gas": "1000000",
            "gas_limit": "1000000"
        }
        return [
            publishEvent
        ];
    }
}