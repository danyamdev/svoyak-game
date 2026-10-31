import { describe, expect, it } from 'vitest'

import { normalizeAcceptedAnswers } from './accepted-answers'

describe('normalizeAcceptedAnswers', () => {
  it('keeps the primary answer first and removes empty duplicate alternatives', () => {
    expect(
      normalizeAcceptedAnswers(' Полтергейст ', ['Шумный дух', 'полтергейст', '', ' Шумный дух ']),
    ).toEqual(['Полтергейст', 'Шумный дух'])
  })
})
