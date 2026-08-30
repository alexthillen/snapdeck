import { Notetype } from 'ankipack'
import frontBasicTemplate from '../../assets/templates/front_basic.html?raw'
import backBasicTemplate from '../../assets/templates/back_basic.html?raw'

export const BasicCardNotetype = new Notetype({
  name: 'SnapDeck : Basic',
  id: 1276888190,
  fields: [
    { name: 'Front' },
    { name: 'Back' },
    { name: 'Extra' },
    { name: 'Difficulty' },
  ],
  templates: [
    {
      name: 'SnapDeck : Basic Card',
      questionFormat: frontBasicTemplate,
      answerFormat: backBasicTemplate,
    },
  ],
  css: '',
})
