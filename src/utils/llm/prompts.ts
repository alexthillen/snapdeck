import promptBasic from '../../assets/prompts/basic-generation.txt'
import promptCloze from '../../assets/prompts/cloze-generation.txt'

export type PromptCardType = 'BASIC' | 'CLOZE'

type BuildPromptOptions = {
  targetCards: number
  sectionTitle: string
  coverage: string
}

const PROMPT_PATH: Record<PromptCardType, string> = {
  BASIC: promptBasic,
  CLOZE: promptCloze,
}

const cache = new Map<PromptCardType, string>()

const replaceToken = (template: string, token: string, value: string): string =>
  template.replace(new RegExp(`\\{${token}\\}`, 'g'), value)

const applyTemplate = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (acc, [token, value]) => replaceToken(acc, token, value),
    template,
  )

export async function loadPromptTemplate(
  type: PromptCardType,
  replacements: Record<string, string>,
): Promise<string> {
  if (!cache.has(type)) {
    const response = await fetch(PROMPT_PATH[type])
    if (!response.ok) {
      throw new Error(`Failed to load ${type.toLowerCase()} prompt template`)
    }
    const template = await response.text()
    cache.set(type, template)
  }

  const base = cache.get(type) ?? ''
  return applyTemplate(base, replacements)
}

export const buildPrompt = async (
  type: PromptCardType,
  options: BuildPromptOptions,
  examples = '',
): Promise<string> =>
  loadPromptTemplate(type, {
    num_cards: String(options.targetCards),
    section_title: options.sectionTitle,
    coverage: options.coverage,
    card_examples: examples,
  })
