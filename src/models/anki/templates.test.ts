import { describe, expect, it } from 'vitest'
import frontBasic from '../../assets/templates/front_basic.html?raw'
import backBasic from '../../assets/templates/back_basic.html?raw'
import frontCloze from '../../assets/templates/front_cloze.html?raw'
import backCloze from '../../assets/templates/back_cloze.html?raw'
import { BasicCardModel } from './basic'
import { ClozeCardModel } from './cloze'

const templates = [frontBasic, backBasic, frontCloze, backCloze]

describe('exported card template contract', () => {
  it('pins every card side to the tested Better Markdown Anki renderer', () => {
    templates.forEach(template => {
      expect(template).toContain('better-markdown-anki@v0.0.18')
      expect(template).toContain('_better_markdown_anki.js')
      expect(template).toContain('_better_markdown_anki.css')
    })
  })

  it('keeps the fields expected by the renderer and review UI', () => {
    expect(BasicCardModel.props.flds.map((field: { name: string }) => field.name)).toEqual([
      'Front',
      'Back',
      'Extra',
      'Difficulty',
    ])
    expect(ClozeCardModel.props.flds.map((field: { name: string }) => field.name)).toEqual([
      'Text',
      'Back Extra',
      'Difficulty',
    ])
    expect(frontBasic).toContain('id="front-card-basic"')
    expect(backBasic).toContain('id="back-card-basic"')
    expect(frontCloze).toContain('id="front-card-cloze"')
    expect(backCloze).toContain('id="back-card-cloze"')
  })
})
