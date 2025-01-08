import { API } from '@miso.ai/commons';
import Workflow from './base.js';
import { fields } from '../actor/index.js';
import { STATUS, ROLE } from '../constants.js';
import { SearchBoxLayout, ListLayout, TextLayout, FacetsLayout, MoreButtonLayout } from '../layout/index.js';
import { writeKeywordsToData, writeFiltersToPayload, retainFacetCountsInData, writeExhaustionToData, concatItemsFromMoreResponse } from './processors.js';
import { mergeRolesOptions, makeConfigurable } from './options.js';

const DEFAULT_ROWS = 10;
const DEFAULT_PAGE_LIMIT = 10;

const DEFAULT_API_OPTIONS = Object.freeze({
  ...Workflow.DEFAULT_API_OPTIONS,
  group: API.GROUP.SEARCH,
  payload: {
    ...Workflow.DEFAULT_API_OPTIONS.payload,
    fl: ['cover_image', 'url', 'created_at', 'updated_at', 'published_at', 'title'],
    rows: DEFAULT_ROWS,
  },
});

const DEFAULT_LAYOUTS = Object.freeze({
  ...Workflow.DEFAULT_LAYOUTS,
  [ROLE.QUERY]: [SearchBoxLayout.type],
  [ROLE.PRODUCTS]: [ListLayout.type, { incremental: true, infiniteScroll: true }],
  [ROLE.KEYWORDS]: [TextLayout.type, { raw: true }],
  [ROLE.TOTAL]: [TextLayout.type, { raw: true, format: 'number' }],
  [ROLE.FACETS]: [FacetsLayout.type],
  [ROLE.MORE]: [MoreButtonLayout.type],
});

const DEFAULT_TRACKERS = Object.freeze({
  ...Workflow.DEFAULT_TRACKERS,
  [ROLE.PRODUCTS]: {},
});

const DEFAULT_PAGINATION = Object.freeze({
  active: false,
  mode: 'infiniteScroll',
  pageLimit: 10,
});

const DEFAULT_OPTIONS = Object.freeze({
  ...Workflow.DEFAULT_OPTIONS,
  api: DEFAULT_API_OPTIONS,
  layouts: DEFAULT_LAYOUTS,
  trackers: DEFAULT_TRACKERS,
  pagination: DEFAULT_PAGINATION,
});

const ROLES_OPTIONS = mergeRolesOptions(Workflow.ROLES_OPTIONS, {
  main: ROLE.PRODUCTS,
  members: Object.keys(DEFAULT_LAYOUTS),
  mappings: {
    [ROLE.FACETS]: 'facet_counts',
  },
});

export default class SearchBasedWorkflow extends Workflow {

  _initSubscriptions(args) {
    super._initSubscriptions(args);
    this._unsubscribes = [
      ...this._unsubscribes,
      this._hub.on(fields.query(), args => this._query(args)),
      this._hub.on(fields.filters(), filters => this._refine(filters)),
      this._hub.on(fields.more(), () => this._more()),
    ];
  }

  restart() {
    super.restart();
    this._page = 0;
  }

  // properties //
  get exhausted() {
    const data = this._hub.states[fields.data()];
    return !!(data && data.meta && data.meta.exhausted);
  }

  get page() {
    return this._page;
  }

  // query //
  query(args) {
    if (!args.q) {
      throw new Error(`q is required in query() call`);
    }
    this._hub.update(fields.query(), args);
  }

  _query(args) {
    // keep track of the query args for refine and more calls
    this._queryArgs = args;

    // start a new session
    this.restart();

    // payload
    const payload = this._buildPayload(args);

    this._request({ payload });
  }

  _refine(filters) {
    // remember current facet_counts
    const { facet_counts } = this._hub.states[fields.data()].value || {};
    this._currentFacetCounts = facet_counts;

    // start a new session
    this.restart();

    // payload
    const query = this._getQuery();
    const payload = this._buildPayload({ ...query, filters });

    this._request({ payload });
  }

  _more() {
    // if still loading, complain
    if (this.status !== STATUS.READY) {
      throw new Error(`Can not call more() while loading.`);
    }
    // no more pages, ignore
    if (this.exhausted || this._page >= DEFAULT_PAGE_LIMIT - 1) {
      return;
    }
    // don't create a new session!

    this._page++;

    // payload
    const query = this._getQuery();
    const filters = this._hub.states[fields.filters()]; // get stored filters
    let payload = this._buildPayload({ ...query, filters });
    payload = this._processPayloadForMoreRequest(payload);

    this._request({ payload });
  }

  _getQuery() {
    // TODO: just get from the hub
    return this._queryArgs;
  }

  _getPageSize() {
    return this._options.resolved.api.payload.rows;
  }

  _buildPayload({ filters, ...payload } = {}) {
    payload = writeFiltersToPayload(payload, filters);
    payload = this._writePageInfoToPayload(payload);
    return payload;
  }

  _writePageInfoToPayload(payload) {
    return {
      ...payload,
      _meta: {
        ...payload._meta,
        page: this._page,
      },
    };
  }

  _processPayloadForMoreRequest(payload = {}) {
    const data = this._hub.states[fields.data()];
    const { [this._roles.main]: items = [] } = (data && data.value) || {};
    const productIds = items.map(item => item.product_id).filter(v => v);
    const exclude = [...(payload.exclude || []), ...productIds];
    if (exclude.length === 0) {
      return payload;
    }
    return {
      ...payload,
      exclude,
    };
  }

  // data //
  _defaultProcessData(data) {
    data = super._defaultProcessData(data);
    data = writeKeywordsToData(data);
    data = retainFacetCountsInData(data, this._currentFacetCounts);
    data = writeExhaustionToData(data, { role: this._roles.main });
    return data;
  }

  _updateDataInHub(data) {
    data = this._appendResultsFromMoreRequest(data);
    super._updateDataInHub(data);
  }

  _appendResultsFromMoreRequest(data) {
    const { request } = data;
    if (!request) {
      return data; // the initial state
    }
    const { _meta } = request.payload;
    if (!_meta || !_meta.page) {
      return data; // not from "more" request
    }
    // concat records if it's from "more" request
    const currentData = this._hub.states[fields.data()];
    return concatItemsFromMoreResponse(currentData, data, { role: this._roles.main });
  }

}

makeConfigurable(SearchBasedWorkflow.prototype, ['pagination']);

Object.assign(SearchBasedWorkflow, {
  DEFAULT_API_OPTIONS,
  DEFAULT_LAYOUTS,
  DEFAULT_TRACKERS,
  DEFAULT_PAGINATION,
  DEFAULT_OPTIONS,
  ROLES_OPTIONS,
});
