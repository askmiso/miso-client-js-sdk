import { delegateGetters, asArray } from '@miso.ai/commons';
import { Saga, ElementsBinder, SessionMaker, DataSupplier, ViewsReactor, fields } from '../saga';
import * as sources from '../source';
import { STATUS } from '../constants';
import { mergeApiParams, injectLogger } from './utils';

export default class Workflow {

  // TODO: define fields?
  constructor(plugin, client, {
    name = '(anonymous)',
    roles,
    defaultApiParams,
  }) {
    this._plugin = plugin;
    this._client = client;
    this._name = name;
    this._roles = roles;

    this._apiParams = this._defaultApiParams = defaultApiParams;

    const saga = this._saga = injectLogger(new Saga(), (...args) => this._log(...args));
    this._elements = new ElementsBinder(saga);
    this._sessions = new SessionMaker(saga);
    this._data = new DataSupplier(saga);
    this._views = new ViewsReactor(saga, roles);

    this._unsubscribes = [];

    delegateGetters(this, saga, ['states', 'on']);

    this.useSource('api');
  }

  get uuid() {
    return this.session && this.session.uuid;
  }

  get session() {
    return this._saga.states.session;
  }

  get active() {
    const { session } = this;
    return !!session && session.active;
  }

  get states() {
    return this._saga.states;
  }

  // element //
  bind(role, element) {
    this._elements.bind(role, element);
    return this;
  }

  unbind(role) {
    this._elements.unbind(role);
    return this;
  }

  // states //
  updateData(data) {
    this._assertActive();
    this._saga.update(fields.data(), {
      session: this.session,
      ...data,
    });
    return this;
  }

  notifyViewUpdate(role, state) {
    this._assertActive();
    state = {
      status: STATUS.READY,
      session: this.session,
      ...state,
    };
    this._saga.update(fields.view(role), state);
    this._saga.trigger(fields.view(), { role, state });
    return this;
  }

  // source //
  useApi(name, payload) {
    this._apiParams = mergeApiParams(this._defaultApiParams, { name, payload });
    return this;
  }

  useSource(source) {
    this._data.source = this._normalizeSource(source);
    return this;
  }

  _normalizeSource(source) {
    if (source === 'api') {
      return sources.api(this._client);
    } else if (source === false || typeof source === 'function') {
      return source;
    }
    throw new Error(`Source must be 'api', an async function, or false: ${source}`);
  }

  // layout //
  useLayouts(config) {
    const layouts = {};
    for (const [role, args] of Object.entries(config)) {
      layouts[role] = this._plugin.layouts.create(...asArray(args));
    }
    this._views.layouts = layouts;
    return this;
  }

  // destroy //
  destroy() {
    this._events.emit('destroy');
    this._destroy();
  }

  _destroy() {
    for (const unsubscribe of this._unsubscribes || []) {
      unsubscribe();
    }
    this._unsubscribes = [];

    this._views.destroy();
    this._data.destroy();
    this.unbind(); // TODO
    this._elements.destroy();
  }

  // helper //
  _log(...args) {
    // TODO
    this._plugin._events.emit('workflow', [this._name, ...args]);
  }

  _assertActive() {
    if (!this.active) {
      throw new Error(`Unit is not active yet. Call unit.start() to activate it.`)
    }
  }

  _assertInactive() {
    if (this.active) {
      throw new Error(`Unit has already started.`);
    }
  }

}
