/**
 * Remove object properties with undefined values and return the object itself.
 */
export function trimObj(obj) {
  if (typeof obj !== 'object') {
    return obj;
  }
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] === undefined) {
      delete obj[k];
    }
  }
  return obj;
}

/**
 * Return undefined on emtpy object, or original input otherwise.
 */
export function emptyObjectToUndefined(obj) {
  return (typeof obj === 'object' && Object.keys(obj).length === 0) ? undefined : obj;
}

/**
 * Delegate getters from source object to target object.
 */
export function delegateGetters(target, source, propNames) {
  propNames = typeof propNames === 'string' ? [propNames] : propNames;
  Object.defineProperties(target, propNames.reduce((acc, propName) => {
    acc[propName] = typeof source[propName] === 'function' ? { value: source[propName].bind(source) } : { get: () => source[propName] };
    return acc;
  }, {}));
}

/**
 * Assign values on target object with Object.defineProperties() from source object.
 */
export function defineValues(target, source) {
  for (const name in source) {
    if (source.hasOwnProperty(name)) {
      Object.defineProperty(target, name, { value: source[name] });
    }
  }
}

/**
 * Remove the specified item from array.
 */
export function removeArrayItem(array, item) {
  const i = array.indexOf(item);
  if (i > -1) {
    array.splice(i, 1);
  }
}

/**
 * Wrap function execution with a try-catch block with errors handled by console logging.
 */
export function executeWithCatch(fn, args) {
  try {
    fn.apply(undefined, args);
  } catch (e) {
    console.error(e);
  }
}
