import { BigInt, log, near, json, TypedMap, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts';
import { Response, PublishChainConfig, PublishEvent, Signature, AggregatedEvent } from '../generated/schema';

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    handleAction(actions[i], receipt.receipt, receipt.outcome.logs, receipt.block.header);
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  logs: string[],
  blockHeader: near.BlockHeader,
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    return;
  }

  const functionCall = action.toFunctionCall();
  log.info("functionCall: {}, {}, {}", [functionCall.methodName, functionCall.args.toString(), logs.toString()]);

  if (functionCall.methodName == "publish_callback") {
    handlePublish(logs, blockHeader);
  } else if (functionCall.methodName == "post_aggregate_callback") {
    handleAggregated(logs, blockHeader);
  }
}

function handlePublish(logs: string[], blockHeader: near.BlockHeader): void {
  const _event = extractEvent("Publish", logs);
  if (!_event) {
    return;
  }

  const nanoId = `${blockHeader.timestampNanosec}`;
  const _eventData = _event.mustGet("data").toObject();
  const request_id = _eventData.mustGet("request_id").toString();
  const _responseData = _eventData.mustGet("response").toObject();

  let response = Response.load(nanoId);
  if (response == null) {
    response = parseResponse(_responseData, nanoId);
    response.save();
  }

  let chainConfig = PublishChainConfig.load(nanoId);
  if (chainConfig == null) {
    chainConfig = parseChainConfig(_eventData, nanoId);
    chainConfig.save();
  }

  let signature = Signature.load(nanoId);
  if (signature == null) {
    signature = parseSignature(_eventData, nanoId);
    signature.save();
  }

  let publishEvent = PublishEvent.load(nanoId);
  if (publishEvent == null) {
    publishEvent = new PublishEvent(`${nanoId}`);
    publishEvent.request_id = request_id;
    publishEvent.response = nanoId;
    publishEvent.chain_config = nanoId;
    publishEvent.signature = nanoId;
    publishEvent.nonce = BigInt.fromString(_eventData.mustGet("nonce").toString());
    publishEvent.gas_limit = BigInt.fromString(_eventData.mustGet("gas_limit").toString());
    publishEvent.max_fee_per_gas = BigInt.fromString(_eventData.mustGet("max_fee_per_gas").toString());
    publishEvent.max_priority_fee_per_gas = BigInt.fromString(_eventData.mustGet("max_priority_fee_per_gas").toString());
    publishEvent.save();
  } else {
    log.debug("Publish event already exists: {}", [request_id]);
  }
}

function handleAggregated(logs: string[], blockHeader: near.BlockHeader): void {
  const _event = extractEvent("Aggregated", logs);
  if (!_event) {
    return;
  }
  const nanoId = `${blockHeader.timestampNanosec}`;
  const _eventData = _event.mustGet("data").toObject();
  const request_id = _eventData.mustGet("request_id").toString();

  let response = Response.load(nanoId);
  if (response == null) {
    response = parseResponse(_eventData, nanoId);
    response.save();
  }

  let aggregatedEvent = AggregatedEvent.load(request_id);
  if (aggregatedEvent == null) {
    aggregatedEvent = new AggregatedEvent(request_id);
    aggregatedEvent.request_id = request_id;
    aggregatedEvent.response = nanoId;
    aggregatedEvent.save();
  } else {
    log.debug("Aggregated event already exists: {}", [request_id]);
  }
}

function extractEvent(event: string, logs: string[]): TypedMap<string, JSONValue> | null {
  for (let i = 0; i < logs.length; i++) {
    let _log = logs[i];
    if (_log.includes("EVENT_JSON")) {
      _log = _log.replace("EVENT_JSON: ", "");
      log.debug("==> ### EVENT log : {}", [_log]);
      const jsonValue = json.fromString(_log);
      if (jsonValue.kind == JSONValueKind.OBJECT) {
        const _eventJson = jsonValue.toObject();
        log.debug("Log is a valid JSON object: {}", [_log]);
        const _eventName = jsonValue.toObject().mustGet("event").toString();
        if (_eventJson && _eventName == event) {
          log.debug("===> ### Catch event: {}", [_eventName])
          return _eventJson;
        }
      } else {
        log.error("Log is not a valid JSON object: {}", [_log, jsonValue.toString()]);
      }
    }
  }

  return null;
}

function parseResponse(eventData: TypedMap<string, JSONValue>, nanoId: string): Response {
  log.debug("!!!### parseResponse", []);
  const response = new Response(nanoId);
  response.request_id = eventData.mustGet("request_id").toString();
  response.valid_reporters = eventData.mustGet("valid_reporters").toArray().map<string>((v: JSONValue) => { return v.toString() });
  response.reporter_reward_addresses = eventData.mustGet("reporter_reward_addresses").toArray().map<string>((v: JSONValue) => { return v.toString() });
  response.started_at = BigInt.fromString(eventData.mustGet("started_at").toString());
  response.updated_at = BigInt.fromString(eventData.mustGet("updated_at").toString());
  response.status = eventData.mustGet("status").toString();
  response.call_data = eventData.get("call_data") ? eventData.mustGet("call_data").toString() : null;
  response.result = eventData.mustGet("result").toString();
  response.chain_id = BigInt.fromString(eventData.mustGet("chain_id").toString());
  return response;
}

function parseChainConfig(eventData: TypedMap<string, JSONValue>, nanoId: string): PublishChainConfig {
  log.debug("!!!### parseChainConfig, kind: {}", [eventData.mustGet("chain_config").kind.toString()]);
  const chainConfigJson = eventData.mustGet("chain_config").toObject();
  const chainConfig = new PublishChainConfig(nanoId);
  chainConfig.chain_id = BigInt.fromString(chainConfigJson.mustGet("chain_id").toString());
  chainConfig.xapi_address = chainConfigJson.mustGet("xapi_address").toString();
  return chainConfig;
}

function parseSignature(eventData: TypedMap<string, JSONValue>, nanoId: string): Signature {
  log.debug("!!!### parseSignature", []);
  const signatureJson = json.fromString(eventData.mustGet("signature").toString()).toObject();
  const signature = new Signature(nanoId);
  signature.big_r_affine_point = signatureJson.mustGet("big_r").toObject().mustGet("affine_point").toString();
  signature.recovery_id = signatureJson.mustGet("recovery_id").toI64() as i32;
  signature.s_scalar = signatureJson.mustGet("s").toObject().mustGet("scalar").toString();
  return signature;
}
