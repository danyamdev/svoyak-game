import { describe, expect, it } from 'vitest'

import { getAuctionBidRange, getCatPrices } from './rules'

describe('getAuctionBidRange', () => {
  it('allows only the nominal price when the score is negative', () => {
    expect(getAuctionBidRange(-200, 500)).toEqual({
      minimum: 500,
      maximum: 500,
      canGoAllIn: false,
    })
  })

  it('limits a positive player by their current score', () => {
    expect(getAuctionBidRange(1200, 500)).toEqual({
      minimum: 500,
      maximum: 1200,
      canGoAllIn: true,
    })
  })

  it('rejects a non-positive nominal price', () => {
    expect(() => getAuctionBidRange(100, 0)).toThrow(RangeError)
  })
})

describe('getCatPrices', () => {
  it('returns the minimum and maximum prices of the selected round', () => {
    expect(getCatPrices(0)).toEqual([100, 500])
    expect(getCatPrices(2)).toEqual([300, 1500])
  })
})
