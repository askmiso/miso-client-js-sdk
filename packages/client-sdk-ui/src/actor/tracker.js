import { isElement, findInAncestors, trimObj, asArray, computeIfAbsent, viewable as whenViewable, uuidToTimestamp } from '@miso.ai/commons';
import { STATUS, EVENT_TYPE, TRACKING_STATUS, validateEventType, validateTrackingStatus } from '../constants';
import Items from './items';
import * as fields from './fields';

const { IMPRESSION, VIEWABLE, CLICK } = EVENT_TYPE;
const { UNTRACKED, TRACKING, TRIGGERED } = TRACKING_STATUS;

function mergeOptions(def, opt) {
  // if opt is falsy then return false, merge otherwise
  return !!opt && { ...def, ...opt };
}

function isReady(viewState) {
  return viewState && viewState.status === STATUS.READY;
}

const DEFAULT_TRACKING_OPTIONS = Object.freeze({
  impression: Object.freeze({
  }),
  viewable: Object.freeze({
    area: 0.5,
    duration: 1000,
  }),
  click: Object.freeze({
    lenient: false,
  }),
  watch: false,
});

export default class Tracker {

  constructor(hub, view) {
    this._hub = hub;
    this._view = view;
    const role = this._role = view.role;
    this._items = new Items(hub, view);
    this._viewables = new WeakMap();
    this._options = DEFAULT_TRACKING_OPTIONS;

    this._unsubscribes = [
      // TODO: generalize, eliminate uses of view?
      view.proxyElement.on('click', event => this._handleClick(event)),
      view.on('element', () => this.refresh()),
      hub.on(fields.view(role), () => this.refresh()),
    ];

    this.refresh();
  }

  config(options) {
    const { active } = this._hub;
    if (active) {
      throw new Error(`Cannot change configuration after workflow starts.`);
    }
    this._options = this._normalizeOptions(options);
  }

  _normalizeOptions({ impression = {}, viewable = {}, click = {}, ...options } = {}) {
    return trimObj({
      ...DEFAULT_TRACKING_OPTIONS,
      ...options,
      impression: mergeOptions(DEFAULT_TRACKING_OPTIONS.impression, impression),
      viewable: mergeOptions(DEFAULT_TRACKING_OPTIONS.viewable, viewable),
      click: mergeOptions(DEFAULT_TRACKING_OPTIONS.click, click),
    });
  }

  start() {
    throw new Error(`workflow.tracker.start() is deprecated. Use workflow.startTracker() instead.`);
  }

  refresh() {
    // refresh against workflow element
    this._syncElement();

    // refresh against view state
    const viewState = this._getViewState();
    if (!viewState) {
      return;
    }
    const { session } = viewState;
    if (this._states && session.uuid !== this._states.uuid) {
      this._retireStates();
    }
    if (!this._states && session) {
      this._states = new States(session.uuid);
    }

    // refresh items
    this._refreshItems();
  }

  impression(productIds, options) {
    this._assertViewReady();
    this._trigger(productIds, IMPRESSION, { ...options, manual: true });
  }

  viewable(productIds, options) {
    this._assertViewReady();
    this._trigger(productIds, VIEWABLE, { ...options, manual: true });
  }

  click(productIds, options) {
    this._assertViewReady();
    this._trigger(productIds, CLICK, { ...options, manual: true });
  }

  _getViewState() {
    return this._hub.states[fields.view(this._role)];
  }

  _assertViewReady() {
    if (!this._hub.active) {
      throw new Error(`Workflow is not active. Call workflow.start() to activate it.`);
    }
    if (!isReady(this._getViewState())) {
      throw new Error(`Workflow is not rendered yet. If you handle rendering by yourself, call workflow.notifyViewUpdate() when DOM is ready.`);
    }
  }

  _isViewReady() {
    return this._hub.active && isReady(this._getViewState());
  }

  _getMisoId() {
    const state = this._getViewState();
    return (state && state.meta && state.meta.miso_id) || (this._element && this._element.getAttribute('miso-id')) || undefined;
  }

  getState(productId) {
    // TODO: do we have to be so precise?
    return Object.freeze({
      [CLICK]: this._view.element ? TRACKING : UNTRACKED,
      ...this._states.getFullState(productId),
    });
  }



  _retireStates() {
    const { unbounds } = this._items.unbindAll();
    this._untrackViewables(unbounds);
    this._states = undefined;
  }

  _refreshItems() {
    if (!this._states) {
      return;
    }
    const { element } = this._view;
    const { bounds, unbounds } = this._items.refresh(element);
    this._untrackViewables(unbounds);
    this._trackImpressions(bounds);
    this._trackViewables(bounds);
  }



  // impression //
  _trackImpressions(bindings) {
    const options = this._options.impression;
    if (!options) {
      return;
    }
    const misoId = this._getMisoId();
    this._trigger(bindings.map(b => b.productId), IMPRESSION, { misoId });
  }



  // viewable //
  _trackViewables(bindings) {
    const options = this._options.viewable;
    if (!options) {
      return;
    }
    // TODO: option: useUnitElement? TBD
    for (const binding of bindings) {
      this._trackViewableOnElement(binding);
    }
  }

  async _trackViewableOnElement({ productId, element }) {
    if (!productId || !isElement(element) || this._viewables.has(element)) {
      return;
    }
    // TODO: when element is replaced without proper unload...
    const type = VIEWABLE;
    const state = this._states.get(productId, type);
    if (state !== UNTRACKED) {
      return;
    }
    this._states.set(productId, type, TRACKING);

    const { area, duration } = this._options.viewable;
    const misoId = this._getMisoId();
    // abort signal
    const ac = new AbortController();
    const { signal } = ac;
    this._viewables.set(element, { ac });
    await whenViewable(element, { area, duration, signal });
    this._viewables.delete(element);
    this._trigger([productId], type, { misoId });
  }

  _untrackViewableOnElement({ productId, element }) {
    const viewable = this._viewables.get(element);
    if (!viewable) {
      return;
    }
    viewable.ac.abort();
    this._viewables.delete(element);
    const type = VIEWABLE;
    if (this._states.get(productId, type) === TRACKING) {
      this._states.set(productId, type, UNTRACKED);
    }
  }

  _untrackViewables(bindings) {
    for (const binding of bindings) {
      this._untrackViewableOnElement(binding);
    }
  }



  // click //
  _syncElement() {
    const { element } = this._view;
    if (this._element === element) {
      return;
    }
    // remove observer from old element
    this._retireElement();

    // add observer on new element
    if (element) {
      if (this._options.watch) {
        // TODO: use proxy element
        this._mutationObserver = new MutationObserver(() => this.refresh());
        this._mutationObserver.observe(element, { childList: true, subtree: true });
      }
    }
    this._element = element;
  }

  _retireElement() {
    if (!this._element) {
      return;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = undefined;
    }
    this._element = undefined;
  }

  _handleClick(event) {
    const options = this._options && this._options.click;
    if (!options || !this._isViewReady()) {
      return;
    }
    const binding = findInAncestors(event.target, element => this._items.get(element));
    if (!binding) {
      return;
    }
    const { productId } = binding;

    if (!options.lenient) {
      // it must be a left click
      if (event.button !== 0) {
        return;
      }
      // event default must not be prevented
      if (event.defaultPrevented) {
        return;
      }
      // must go through a real link
      if (!findInAncestors(event.target, element => (element.tagName === 'A' && element.href) || undefined)) {
        return;
      }
    }
    const misoId = this._getMisoId();
    this._trigger([productId], CLICK, { misoId });
  }



  _trigger(productIds, type, { manual = false, misoId } = {}) {
    validateEventType(type);

    if (!this._isViewReady()) {
      return;
    }

    // ignore already triggered
    productIds = this._states.untriggered(asArray(productIds), type);

    if (productIds.length === 0) {
      return;
    }
    this._states.set(productIds, type, TRIGGERED);
    this._hub.trigger(fields.interaction(), this._buildInteraction({ type, productIds, manual, misoId }));
  }

  _buildInteraction({ type, productIds, manual, misoId }) {
    let api_ts;
    if (misoId) {
      try {
        api_ts = uuidToTimestamp(misoId);
      } catch (e) {}
    }
    return trimObj({
      type: type === 'viewable' ? 'viewable_impression' : type,
      product_ids: productIds,
      miso_id: misoId,
      context: {
        custom_context: trimObj({
          api_ts,
          res_prop: toResProp(this._role),
          trigger: manual ? 'manual' : 'auto',
        }),
      },
    });
  }

  _destroy() {
    this._retireElement();
    this._retireStates();
    this._items._destroy();
    for (const unsubscribe of this._unsubscribes) {
      unsubscribe();
    }
    this._unsubscribes = [];
  }

}

/**
 * Tracking states for a session to keep track of the tracking status of each product.
 * For each entry there are status of impression, viewable, and click events. 
 * The actual click tracking status depends on the presence of root element, which is not respected in this object.
 */
class States {

  static NEW = {
    [IMPRESSION]: UNTRACKED,
    [VIEWABLE]: UNTRACKED,
  };

  static UNTRACKED = Object.freeze({
    [IMPRESSION]: UNTRACKED,
    [VIEWABLE]: UNTRACKED,
    [CLICK]: UNTRACKED,
  });

  constructor(uuid) {
    this.uuid = uuid;
    this._states = new Map(); // productId -> {impression, viewable, click}
  }

  getFullState(productId) {
    // when we receive a bind event, impression is trigger, making an entry here
    // so if the state is not found, the product is not present yet => all untracked
    const state = this._states.get(productId);
    return state ? { ...state } : States.UNTRACKED;
  }

  get(productId, type) {
    const state = this._states.get(productId);
    return state && state[type] || UNTRACKED;
  }

  set(productIds, type, status) {
    validateEventType(type);
    validateTrackingStatus(status);
    for (const productId of asArray(productIds)) {
      this._setOne(productId, type, status);
    }
  }

  _setOne(productId, type, status) {
    // leave click untracked/tracking judged by its global state
    computeIfAbsent(this._states, productId, () => ({ ...States.NEW }))[type] = status;
  }

  untriggered(productIds, type) {
    return productIds.filter(productId => this.get(productId, type) !== TRIGGERED);
  }

}

function toResProp(role) {
  // TODO: ad-hoc, see #83
  return role === 'results' ? 'products' : role;
}
