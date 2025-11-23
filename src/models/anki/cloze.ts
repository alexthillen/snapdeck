import { Model } from 'genanki-js'
import frontClozeTemplate from '../../assets/templates/front_cloze.html?raw'
import backClozeTemplate from '../../assets/templates/back_cloze.html?raw'
const MODEL_CLOZE = 1
export const ClozeCardModel = new Model({
  name: 'SnapDeck : Cloze',
  id: '1276888191', // Unique model ID
  flds: [{ name: 'Text' }, { name: 'Back Extra' }, { name: 'Difficulty' }],
  req: [
    [0, 'all', [0]], // Card will be generated only if Front field is non-empty
  ],
  tmpls: [
    {
      name: 'SnapDeck : Cloze Card',
      qfmt: frontClozeTemplate,
      afmt: backClozeTemplate,
    },
  ],
  css: ``,
  type: MODEL_CLOZE,
})
