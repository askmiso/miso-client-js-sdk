import { trimObj, API } from '@miso.ai/commons';
import AnswerBasedWorkflow from './answer-based.js';
import { mergeApiOptions } from './options.js';
import { fields } from '../actor/index.js';
import { ROLE, ORGANIC_QUESTION_SOURCE } from '../constants.js';
import { ListLayout, TextLayout, FacetsLayout } from '../layout/index.js';
import { writeKeywordsToData, addDataInstructions, composeFq } from './processors.js';

const DEFAULT_API_OPTIONS = Object.freeze({
  ...AnswerBasedWorkflow.DEFAULT_API_OPTIONS,
  name: API.NAME.SEARCH,
  payload: {
    ...AnswerBasedWorkflow.DEFAULT_API_OPTIONS.payload,
    source_fl: [...(AnswerBasedWorkflow.DEFAULT_API_OPTIONS.payload.source_fl || []), 'title', 'snippet'],
  },
});

const DEFAULT_LAYOUTS = Object.freeze({
  ...AnswerBasedWorkflow.DEFAULT_LAYOUTS,
  [ROLE.PRODUCTS]: [ListLayout.type, { itemType: 'article' }],
  [ROLE.KEYWORDS]: [TextLayout.type, { raw: true }],
  [ROLE.HITS]: [TextLayout.type, { raw: true, format: 'number' }],
  [ROLE.FACETS]: [FacetsLayout.type],
});

const DEFAULT_TRACKERS = Object.freeze({
  ...AnswerBasedWorkflow.DEFAULT_TRACKERS,
});

const DEFAULT_OPTIONS = Object.freeze({
  ...AnswerBasedWorkflow.DEFAULT_OPTIONS,
  api: DEFAULT_API_OPTIONS,
  layouts: DEFAULT_LAYOUTS,
  trackers: DEFAULT_TRACKERS,
});

const ROLES_CONFIG = Object.freeze({
  [ROLE.QUESTION]: {
    mapping: ROLE.KEYWORDS,
  },
  [ROLE.FACETS]: {
    mapping: 'facet_counts',
  },
});

export default class HybridSearch extends AnswerBasedWorkflow {

  constructor(plugin, client) {
    super({
      name: 'hybrid-search',
      plugin,
      client,
      roles: Object.keys(DEFAULT_LAYOUTS),
      rolesConfig: ROLES_CONFIG,
      defaults: DEFAULT_OPTIONS,
    });
  }

  _initSubscriptions(args) {
    super._initSubscriptions(args);
    this._unsubscribes = [
      ...this._unsubscribes,
      this._hub.on(fields.filters(), filters => this._refine(filters)),
    ];
  }

  // query //
  _buildPayload({ q, qs, filters, ...payload } = {}) {
    const fq = composeFq(filters); // TODO: combine with fq in payload?
    return trimObj({
      ...payload,
      q, // q, not question
      fq,
      _meta: {
        ...payload._meta,
        question_source: qs || ORGANIC_QUESTION_SOURCE, // might be null, not undefined
      },
    });
  }

  _refine(filters) {
    const query = this._hub.states[fields.query()];
    const payload = this._buildPayload({ ...query, filters, answer: false });
    const { session } = this;

    const event = mergeApiOptions(this._options.resolved.api, { payload, session, _skipLoading: true });
    this._request(event);

    // emulate loading status exclusively for products
    // TODO
  }

  // data //
  _defaultProcessData(data) {
    data = super._defaultProcessData(data);
    data = writeKeywordsToData(data);
    data = instructPartialUpdates(data);
    return data;
  }

}

function instructPartialUpdates(data) {
  if (!data.value) {
    return data;
  }
  return addDataInstructions(data, data.value.products ? 
    { includes: [ ROLE.PRODUCTS, ROLE.HITS, ROLE.FACETS, ROLE.KEYWORDS, ROLE.QUESTION ], merge: true } :
    { excludes: [ ROLE.PRODUCTS, ROLE.HITS, ROLE.FACETS ], merge: true });
}
