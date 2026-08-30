import { Notetype } from 'ankipack'
import frontClozeTemplate from '../../assets/templates/front_cloze.html?raw'
import backClozeTemplate from '../../assets/templates/back_cloze.html?raw'
export const ClozeCardNotetype = new Notetype({
  name: 'SnapDeck : Cloze',
  id: 1276888191,
  type: 'cloze',
  fields: [{ name: 'Text' }, { name: 'Back Extra' }, { name: 'Difficulty' }],
  templates: [
    {
      name: 'SnapDeck : Cloze Card',
      questionFormat: frontClozeTemplate,
      answerFormat: backClozeTemplate,
    },
  ],
  css: '',
})
