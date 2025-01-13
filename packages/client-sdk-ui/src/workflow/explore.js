import { API } from '@miso.ai/commons';
import Workflow from './base.js';
import { fields } from '../actor/index.js';
import { ROLE, EVENT_TYPE } from '../constants.js';
import { ListLayout, SearchBoxLayout } from '../layout/index.js';
import { mergeRolesOptions } from './options.js';
import { enableUseLink, UseLinkMixin } from './use-link.js';

const DEFAULT_API_OPTIONS = Object.freeze({
  ...Workflow.DEFAULT_API_OPTIONS,
  group: API.GROUP.ASK,
  name: API.NAME.RELATED_QUESTIONS,
});

const DEFAULT_LAYOUTS = Object.freeze({
  ...Workflow.DEFAULT_LAYOUTS,
  [ROLE.RELATED_QUESTIONS]: [ListLayout.type, { itemType: 'question', link: { rel: 'noopener nofollow' } }],
  [ROLE.QUERY]: [SearchBoxLayout.type, { placeholder: 'Ask a question' }],
});

const DEFAULT_TRACKERS = Object.freeze({
  ...Workflow.DEFAULT_TRACKERS,
  [ROLE.RELATED_QUESTIONS]: {},
  [ROLE.CONTAINER]: {},
  [ROLE.QUERY]: {
    [EVENT_TYPE.SUBMIT]: {},
  },
});

const DEFAULT_OPTIONS = Object.freeze({
  ...Workflow.DEFAULT_OPTIONS,
  api: DEFAULT_API_OPTIONS,
  layouts: DEFAULT_LAYOUTS,
  trackers: DEFAULT_TRACKERS,
});

const ROLES_OPTIONS = mergeRolesOptions(Workflow.ROLES_OPTIONS, {
  main: ROLE.RELATED_QUESTIONS,
  members: Object.keys(DEFAULT_LAYOUTS),
});

export default class Explore extends Workflow {

  constructor(plugin, client) {
    super({
      name: 'explore',
      plugin,
      client,
      roles: ROLES_OPTIONS,
      defaults: DEFAULT_OPTIONS,
    });
  }

  _initProperties(args) {
    super._initProperties(args);
    this._productId = undefined;
    this._linkFn = undefined;
  }

  _initSubscriptions(args) {
    super._initSubscriptions(args);
    this._unsubscribes = [
      ...this._unsubscribes,
      this._views.get(ROLE.RELATED_QUESTIONS).on('click', event => this._handleRelatedQuestionClick(event)),
      this._hub.on(fields.query(), args => this._query(args)),
    ];
  }

  // configuration //
  set productId(value) {
    console.warning('DEPRECATED: use useApi() instead');
    this.useApi({
      product_id: value,
    });
  }

  useApi(options) {
    const { product_id } = options;
    if (product_id) {
      this._productId = product_id;
    }
    return super.useApi(options);
  }

  // lifecycle //
  start({ relatedQuestions = true } = {}) {
    if (this._linkFn === undefined) {
      throw new Error('Must define link mapping function with useLink(fn) before calling start()');
    }
    // in explore workflow, start() triggers query
    // TODO: we should still make the query lifecycle
    if (relatedQuestions) {
      this._request();
    } else {
      // TODO: ad-hoc
      const { session } = this;
      this.updateData({ session, request: {}, value: { related_questions: [] } });
    }
    return this;
  }

  notifyViewUpdate(role = ROLE.RELATED_QUESTIONS, ...args) {
    super.notifyViewUpdate(role, ...args);
    return this;
  }

  _defaultProcessData(data) {
    data = super._defaultProcessData(data);
    data = this._addUrlToRelatedQuestions(data);
    return data;
  }

  _addUrlToRelatedQuestions(data) {
    const { value } = data;
    if (!value || !value.related_questions) {
      return data;
    }
    const linkFn = this._linkFn && this._linkFn[0];
    const related_questions = value.related_questions.map(linkFn ? (text => ({ text, url: this._getSubmitUrl({ q: text }, { generated: true }) })) : (text => ({ text })));
    return {
      ...data,
      value: {
        ...value,
        related_questions,
      },
    };
  }

  _handleRelatedQuestionClick({ value: question, ...event }) {
    this._events.emit('select', Object.freeze({ ...event, question }));
  }

  query(args) {
    if (!args.q) {
      throw new Error(`q is required in query() call`);
    }
    this._hub.update(fields.query(), args);
  }

  _query(args) {
    this._submitToPage(args);
  }

  _getSubmitUrl(args, { generated = false } = {}) {
    let url = UseLinkMixin.prototype._getSubmitUrl.call(this, args);
    if (!generated || !this._productId) {
      return url;
    }
    return `${url}&qs=${encodeURIComponent(this._productId)}`;
  }

}

enableUseLink(Explore.prototype);
