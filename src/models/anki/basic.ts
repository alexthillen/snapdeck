import { Model } from 'genanki-js'
import frontBasicTemplate from '../../assets/templates/front_basic.html?raw'
import backBasicTemplate from '../../assets/templates/back_basic.html?raw'

export const BasicCardModel = new Model({
  name: 'SnapDeck : Basic',
  id: '1276888190', // Unique model ID
  flds: [
    { name: 'Front' },
    { name: 'Back' },
    { name: 'Extra' },
    { name: 'Difficulty' },
  ],
  req: [
    [0, 'all', [0]], // Card will be generated only if Front field is non-empty
  ],
  tmpls: [
    {
      name: 'SnapDeck : Basic Card',
      qfmt: frontBasicTemplate,
      afmt: backBasicTemplate,
    },
  ],
  css: ``,
})
