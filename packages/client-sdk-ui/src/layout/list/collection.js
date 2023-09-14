import { defineValues } from '@miso.ai/commons';
import { STATUS, LAYOUT_CATEGORY } from '../../constants.js';
import TemplateBasedLayout from '../template.js';
import { product, question } from '../templates.js';

const VALUE = Symbol.for('miso.value');

function root(layout, state) {
  const { className, role, templates } = layout;
  const { status } = state;
  const roleAttr = role ? `data-role="${role}"` : '';
  return `<div class="${className} ${status}" ${roleAttr}>${status === STATUS.READY ? templates[status](layout, state) : ''}</div>`;
}

function ready(layout, state) {
  const { templates } = layout;
  const values = state.value;

  // TODO: handle categories, attributes, etc. by introducing sublayout
  if ((values && values.length > 0) || state.ongoing) {
    return templates.list(layout, state, values);
  } else {
    return templates.empty(layout, state);
  }
}

function list(layout, state, values) {
  const { className, templates, options } = layout;
  // TODO: support separator?
  return `<ul class="${className}__list" data-item-type="${options.itemType}">${templates.items(layout, state, values)}</ul>`;
}

function items(layout, state, values) {
  const { templates } = layout;
  let index = 0;
  return values.map(value => templates.item(layout, state, value, index++)).join('');
}

function item(layout, state, value, index) {
  const { className, templates, options } = layout;
  const { itemType } = options;
  const body = templates[itemType](layout, state, value, { index });
  return `<li class="${className}__item">${body}</li>`;
}

// TODO: let templates.js control what to be included here

const DEFAULT_TEMPLATES = Object.freeze({
  product,
  question,
  root,
  [STATUS.READY]: ready,
  empty: () => ``,
  list,
  items,
  item,
});

export default class CollectionLayout extends TemplateBasedLayout {

  static get category() {
    return LAYOUT_CATEGORY.LIST;
  }

  static get defaultTemplates() {
    return DEFAULT_TEMPLATES;
  }

  constructor({ templates, itemType = 'product', ...options }) {
    super({
      templates: { ...DEFAULT_TEMPLATES, ...templates },
      itemType,
      ...options,
    });
    defineValues(this, {
      bindings: Object.freeze({
        list: this._listBindings.bind(this),
      }),
    });
    this._view = undefined;
  }

  initialize(view) {
    this._view = view;
    const { proxyElement } = this._view = view;
    this._unsubscribes.push(proxyElement.on('click', this._onClick.bind(this)));
  }

  _preprocess({ state, rendered }) {
    const incremental = this._shallRenderIncrementally(state, rendered);
    const html = this._html(state, rendered, incremental);
    return {
      ...state,
      incremental,
      html,
    };
  }

  _shallRenderIncrementally(state, rendered) {
    // TODO: compare item ids as well
    return this.options.incremental &&
    rendered && rendered.value && rendered.value.length > 0 &&
      state.status === STATUS.READY &&
      rendered.status === STATUS.READY &&
      state.session && rendered.session &&
      state.session.id === rendered.session.id;
  }

  _html(state, rendered, incremental) {
    if (incremental) {
      const values = state.value.slice(rendered.value.length);
      return values.length > 0 ? this.templates.items(this, state, values) : '';
    } else {
      return this.templates.root(this, state);
    }
  }

  _render(element, { state }, { notifyUpdate }) {
    const { incremental, html } = state;
    if (incremental) {
      if (html) {
        const listElement = this._getListElement(element);
        listElement.insertAdjacentHTML('beforeend', html);
      } else {
        notifyUpdate(false);
      }
    } else {
      element.innerHTML = html;
    }
    this._syncValues(element, state);
  }

  _syncValues(element, state) {
    if (!element) {
      return;
    }
    const values = state.value || [];
    let i = 0;
    for (const itemElement of this._listItemElements(element)) {
      itemElement[VALUE] = values[i++];
    }
  }

  _getListElement(element) {
    return element.querySelector(`.${this.className}__list`);
  }

  _listItemElements(element) {
    return element ? Array.from(element.querySelectorAll(`[data-role="item"]`)) : [];
  }

  _listBindings(element) {
    return this._listItemElements(element).map(element => {
      const value = element[VALUE];
      const key = this.options.itemType === 'product' ? value.product_id : value;
      return { element, key, value };
    });
  }

  _onClick(event) {
    const element = event.target.closest(`[data-role="item"]`);
    if (!element) {
      return;
    }
    const value = element[VALUE];
    const { session } = this._view._state;
    this._view._events.emit('click', { session, value, element });
  }

  destroy() {
    this._view = undefined;
    super.destroy();
  }

}
