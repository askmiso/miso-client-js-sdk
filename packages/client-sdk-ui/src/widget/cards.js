import CollectionWidget from './collection';

function renderProduct(widget, state, { url, cover_image, title, description, sale_price, original_price, ...product }) {
  const { className } = widget;
  const openTag = url ? `<a class="${className}__item-body" href="${url}" target="_blank" rel="noopener">` : `<div class="${className}__item-body">`;
  const clostTag = url ? `</a>` : `</div>`;

  const img = cover_image ? `<img class="${className}__item-cover-image" src="${cover_image}">` : '';
  const imgBox = `<div class="${className}__item-cover-image-container">${img}</div>`;

  let infoContent = '';
  if (title) {
    infoContent += `<div class="${className}__item-title">${title}</div>`;
  }
  if (description) {
    infoContent += `<div class="${className}__item-desc">${description}</div>`;
  }
  const price = sale_price || original_price;
  if (price) {
    infoContent += `<hr><div class="${className}__item-price">${price}</div>`;
    // TODO: enhance this
  }
  const infoBox = `<div class="${className}__item-info-container">${infoContent}</div>`;

  return `${openTag}${imgBox}${infoBox}${clostTag}`;
}

const TYPE = 'cards';
const DEFAULT_CLASSNAME = 'miso-cards';

const DEFAULT_TEMPLATES = Object.freeze({
  product: renderProduct,
});

const INHERITED_DEFAULT_TEMPLATES = Object.freeze({
  ...CollectionWidget.defaultTemplates,
  DEFAULT_TEMPLATES,
});

export default class CardsWidget extends CollectionWidget {

  static get type() {
    return TYPE;
  }

  static get defaultTemplates() {
    return INHERITED_DEFAULT_TEMPLATES;
  }

  static get defaultClassName() {
    return DEFAULT_CLASSNAME;
  }

  constructor({ className = DEFAULT_CLASSNAME, templates } = {}) {
    super(className, { ...DEFAULT_TEMPLATES, ...templates });
  }

}
