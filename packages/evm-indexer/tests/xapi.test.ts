import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { AggregatorConfigSet } from "../generated/schema"
import { AggregatorConfigSet as AggregatorConfigSetEvent } from "../generated/XAPI/XAPI"
import { handleAggregatorConfigSet } from "../src/xapi"
import { createAggregatorConfigSetEvent } from "./xapi-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let aggregator = "Example string value"
    let perReporterFee = BigInt.fromI32(234)
    let publishFee = BigInt.fromI32(234)
    let fulfillAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let rewardAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newAggregatorConfigSetEvent = createAggregatorConfigSetEvent(
      aggregator,
      perReporterFee,
      publishFee,
      fulfillAddress,
      rewardAddress
    )
    handleAggregatorConfigSet(newAggregatorConfigSetEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AggregatorConfigSet created and stored", () => {
    assert.entityCount("AggregatorConfigSet", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AggregatorConfigSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "aggregator",
      "Example string value"
    )
    assert.fieldEquals(
      "AggregatorConfigSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "perReporterFee",
      "234"
    )
    assert.fieldEquals(
      "AggregatorConfigSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "publishFee",
      "234"
    )
    assert.fieldEquals(
      "AggregatorConfigSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "fulfillAddress",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AggregatorConfigSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "rewardAddress",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
