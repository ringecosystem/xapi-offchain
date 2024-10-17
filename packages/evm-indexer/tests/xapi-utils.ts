import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  AggregatorConfigSet,
  AggregatorSuspended,
  Fulfilled,
  OwnershipTransferStarted,
  OwnershipTransferred,
  RequestMade,
  RewardsWithdrawn
} from "../generated/XAPI/XAPI"

export function createAggregatorConfigSetEvent(
  exAggregator: Address,
  reportersFee: BigInt,
  publishFee: BigInt,
  aggregator: string,
  rewardAddress: Address
): AggregatorConfigSet {
  let aggregatorConfigSetEvent = changetype<AggregatorConfigSet>(newMockEvent())

  aggregatorConfigSetEvent.parameters = new Array()

  aggregatorConfigSetEvent.parameters.push(
    new ethereum.EventParam(
      "exAggregator",
      ethereum.Value.fromAddress(exAggregator)
    )
  )
  aggregatorConfigSetEvent.parameters.push(
    new ethereum.EventParam(
      "reportersFee",
      ethereum.Value.fromUnsignedBigInt(reportersFee)
    )
  )
  aggregatorConfigSetEvent.parameters.push(
    new ethereum.EventParam(
      "publishFee",
      ethereum.Value.fromUnsignedBigInt(publishFee)
    )
  )
  aggregatorConfigSetEvent.parameters.push(
    new ethereum.EventParam("aggregator", ethereum.Value.fromString(aggregator))
  )
  aggregatorConfigSetEvent.parameters.push(
    new ethereum.EventParam(
      "rewardAddress",
      ethereum.Value.fromAddress(rewardAddress)
    )
  )

  return aggregatorConfigSetEvent
}

export function createAggregatorSuspendedEvent(
  exAggregator: Address,
  aggregator: string
): AggregatorSuspended {
  let aggregatorSuspendedEvent = changetype<AggregatorSuspended>(newMockEvent())

  aggregatorSuspendedEvent.parameters = new Array()

  aggregatorSuspendedEvent.parameters.push(
    new ethereum.EventParam(
      "exAggregator",
      ethereum.Value.fromAddress(exAggregator)
    )
  )
  aggregatorSuspendedEvent.parameters.push(
    new ethereum.EventParam("aggregator", ethereum.Value.fromString(aggregator))
  )

  return aggregatorSuspendedEvent
}

export function createFulfilledEvent(
  requestId: BigInt,
  response: ethereum.Tuple,
  status: i32
): Fulfilled {
  let fulfilledEvent = changetype<Fulfilled>(newMockEvent())

  fulfilledEvent.parameters = new Array()

  fulfilledEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  fulfilledEvent.parameters.push(
    new ethereum.EventParam("response", ethereum.Value.fromTuple(response))
  )
  fulfilledEvent.parameters.push(
    new ethereum.EventParam(
      "status",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(status))
    )
  )

  return fulfilledEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent = changetype<OwnershipTransferStarted>(
    newMockEvent()
  )

  ownershipTransferStartedEvent.parameters = new Array()

  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferStartedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRequestMadeEvent(
  requestId: BigInt,
  aggregator: string,
  requestData: string,
  requester: Address
): RequestMade {
  let requestMadeEvent = changetype<RequestMade>(newMockEvent())

  requestMadeEvent.parameters = new Array()

  requestMadeEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  requestMadeEvent.parameters.push(
    new ethereum.EventParam("aggregator", ethereum.Value.fromString(aggregator))
  )
  requestMadeEvent.parameters.push(
    new ethereum.EventParam(
      "requestData",
      ethereum.Value.fromString(requestData)
    )
  )
  requestMadeEvent.parameters.push(
    new ethereum.EventParam("requester", ethereum.Value.fromAddress(requester))
  )

  return requestMadeEvent
}

export function createRewardsWithdrawnEvent(
  withdrawer: Address,
  amount: BigInt
): RewardsWithdrawn {
  let rewardsWithdrawnEvent = changetype<RewardsWithdrawn>(newMockEvent())

  rewardsWithdrawnEvent.parameters = new Array()

  rewardsWithdrawnEvent.parameters.push(
    new ethereum.EventParam(
      "withdrawer",
      ethereum.Value.fromAddress(withdrawer)
    )
  )
  rewardsWithdrawnEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return rewardsWithdrawnEvent
}
