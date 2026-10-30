import type { GameRules } from './model'

export const DEFAULT_GAME_RULES: GameRules = {
  allowNegativeScores: true,
  allowReboundAnswers: true,
  maxIndividualPlayers: 5,
  maxTeams: 5,
  maxTeamMembers: 5,
  finalMinimumWager: 1,
  finalRequiresPositiveScore: true,
  tieBreakerEnabled: true,
}

export const ROUND_PRICE_SCALES = [
  [100, 200, 300, 400, 500],
  [200, 400, 600, 800, 1000],
  [300, 600, 900, 1200, 1500],
] as const

export interface AuctionBidRange {
  minimum: number
  maximum: number
  canGoAllIn: boolean
}

export function getAuctionBidRange(score: number, nominalPrice: number): AuctionBidRange {
  if (!Number.isInteger(nominalPrice) || nominalPrice <= 0) {
    throw new RangeError('Номинал аукциона должен быть положительным целым числом')
  }

  // Номинал служит гарантированным минимумом: даже участник с нулевым или
  // отрицательным счётом остаётся в торгах, но может поставить только номинал.
  return {
    minimum: nominalPrice,
    maximum: Math.max(score, nominalPrice),
    canGoAllIn: score > nominalPrice,
  }
}

export function getCatPrices(roundIndex: number): readonly [number, number] {
  const scale = ROUND_PRICE_SCALES[roundIndex]

  if (!scale) {
    throw new RangeError('Раунд не существует')
  }

  // «Кот» предлагает только крайние значения шкалы выбранного раунда.
  return [scale[0], scale[scale.length - 1]]
}
