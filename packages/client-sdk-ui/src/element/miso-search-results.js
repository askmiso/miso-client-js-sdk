import { ROLE } from '../constants';
import { getClient } from './utils';

const TAG_NAME = 'miso-search-results';

export default class MisoSearchResultsElement extends HTMLElement {

  static get role() {
    return ROLE.RESULTS;
  }

  static get tagName() {
    return TAG_NAME;
  }

  // lifecycle //
  async connectedCallback() {
    // find client & auto bind
    const client = await getClient();
    client.ui.search.bind(this.constructor.role, this);
  }

}
