import { describe, expect, it } from 'vitest'
import { normaliseAnkiTag, normaliseSemanticTag } from './ankiTags'

describe('Anki tag normalization', () => {
  it('preserves hierarchy while making edited tags safe for Anki', () => {
    expect(normaliseAnkiTag('Operating Systems::Process States')).toBe(
      'operating_systems::process_states',
    )
    expect(normaliseAnkiTag('  ')).toBeNull()
    expect(normaliseAnkiTag('one::::two')).toBe('one::two')
  })

  it('rejects structural semantic tags while retaining precise topics', () => {
    expect(normaliseSemanticTag('computer_science::operating_systems')).toBe(
      'computer_science::operating_systems',
    )
    expect(normaliseSemanticTag('computer_science::chapter')).toBeNull()
  })
})
