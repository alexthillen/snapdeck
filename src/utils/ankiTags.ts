const STRUCTURAL_TAG_PART =
  /^(?:topic|introduction|overview|chapter|section|document_structure|part_(?:[ivxlcdm]+|\d+))$/

const cleanTagPart = (value: string): string =>
  value
    .trim()
    .replace(/::/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '')

export const normaliseTagPart = (value: string): string =>
  cleanTagPart(value) || 'untitled'

export const normaliseAnkiTag = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed || /<[^>]+>/.test(trimmed)) return null

  const parts = trimmed
    .split('::')
    .map(part => cleanTagPart(part).toLowerCase())
    .filter(Boolean)

  return parts.length ? parts.join('::') : null
}

export const normaliseSemanticTag = (value: string): string | null => {
  const tag = normaliseAnkiTag(value)
  if (!tag) return null

  return tag.split('::').some(part => STRUCTURAL_TAG_PART.test(part))
    ? null
    : tag
}
