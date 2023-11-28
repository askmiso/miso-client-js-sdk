import { defineValues } from '@miso.ai/commons';
import { PREFIX } from './constants.js';

export default class AskComboElements {

  constructor(root) {
    if (!root) {
      throw new Error('Root element is required');
    }
    defineValues(this, {
      root,
      followUpsSection: root.querySelector(`#${PREFIX}__follow-ups`),
      relatedResourcesContainer: root.querySelector(`#${PREFIX}__related-resources miso-ask`),
    });

    if (!this.followUpsSection) {
      throw new Error(`Follow-ups section element not found.`);
    }
    if (!this.relatedResourcesContainer) {
      throw new Error(`Related resources container element not found.`);
    }
  }

}
