import { defineValues, trimObj } from '@miso.ai/commons';
import { API } from '@miso.ai/client-sdk-core';
import Workflow from './base.js';
import { fields, Tracker } from '../actor/index.js';
import { ListLayout } from '../layout/index.js';
import { ROLE } from '../constants.js';

const DEFAULT_API_PARAMS = Object.freeze({
  group: API.GROUP.RECOMMENDATION,
  name: API.NAME.USER_TO_PRODUCTS,
  payload: {
    fl: ['*'],
  },
});

const DEFAULT_LAYOUTS = Object.freeze({
  [ROLE.PRODUCTS]: ListLayout.type,
});

export default class Recommendation extends Workflow {

  constructor(context, id) {
    super(context._plugin, context._client, {
      name: 'recommendation',
      roles: Object.keys(DEFAULT_LAYOUTS),
      layouts: DEFAULT_LAYOUTS,
      defaultApiParams: DEFAULT_API_PARAMS,
    });
    this._tracker = new Tracker(this._hub, this._views.get(ROLE.PRODUCTS));

    defineValues(this, { id });
    this._context = context;

    context._members.set(id, this);
  }

  get tracker() {
    return this._tracker;
  }

  // layout //
  useLayouts({ [ROLE.RESULTS]: results, ...layouts } = {}) {
    // fallback
    if (results !== undefined) {
      console.warn(`useLayouts({ ${[ROLE.RESULTS]}: ... }) is deprecated, use useLayouts({ ${[ROLE.PRODUCTS]}: ... }) instead`);
      layouts[ROLE.PRODUCTS] = results;
    }
    super.useLayouts(layouts);
  }

  // lifecycle //
  start() {
    this._sessions.start();
    // in recommendation workflow, start() triggers query
    // TODO: we should still make the query lifecycle
    const { session } = this;
    this._hub.update(fields.input(), { ...this._apiParams, session });
    return this;
  }

  startTracker() {
    this.useApi(false);
    this.useLayouts({
      [ROLE.PRODUCTS]: false,
    });
    this._sessions.start();
    this.notifyViewUpdate(ROLE.PRODUCTS);
    return this;
  }

  notifyViewUpdate(role = ROLE.PRODUCTS, ...args) {
    super.notifyViewUpdate(role, ...args);
    return this;
  }

  // tracker //
  useTracker(options) {
    this._tracker.config(options);
    return this;
  }

  // interactions //
  _preprocessInteraction(payload) {
    payload = super._preprocessInteraction(payload) || {};
    const { context = {} } = payload;
    const { custom_context = {} } = context;
    return {
      ...payload,
      context: {
        ...context,
        custom_context: trimObj({
          unit_id: this.id,
          unit_instance_uuid: this.uuid,
          ...custom_context,
        }),
      },
    };
  }

  // destroy //
  _destroy() {
    this._context._members.delete(this.id);
    this._tracker._destroy();
    super._destroy();
  }

}
