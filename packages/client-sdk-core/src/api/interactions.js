import ApiBase from './base';

export default class Interactions extends ApiBase {

  constructor(api) {
    super(api, 'interactions');
  }

  async upload(payload, options) {
    try {
      return await this._run('upload', payload, options);
    } catch (e) {
      if (e.status === 400 && e.message && e.message.toLowerCase().indexOf('playground') > -1) {
        this._warn(`Ignore interactions uploaded to playground app.`);
      } else {
        throw e;
      }
    }
  }

  _url({ apiGroup, apiName }) {
    const url = this.helpers.url(this._apiPath);
    return this.helpers.applyUrlPasses(this, { apiGroup, apiName, url });
  }

  _preprocess({ apiGroup, apiName, payload }) {
    if (apiName === 'upload') {
      payload = this._normalizeUploadPayload(payload);
    }
    return super._preprocess({ apiGroup, apiName, payload });
  }

  _normalizeUploadPayload(payload) {
    // TODO: accept string as a shortcut of { type: payload } as well
    if (typeof payload !== 'object') {
      throw new Error(`Interactions payload has to be either an object or an array of objects: ${payload}`);
    }
    if (!Array.isArray(payload)) {
      payload = [payload];
    }
    return { data: payload };
  }

  async _send({ options: { useBeacon = true, ...options } = {}, ...args }) {
    if (useBeacon) {
      const { url, payload } = args;
      this.helpers.sendBeacon(url, payload, options);
      return {};
    } else {
      return super._send({ ...args, options });
    }
  }

}
