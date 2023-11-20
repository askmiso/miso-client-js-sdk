<div align="center">
  <div>
    <a href="https://miso.ai">
      <img src=".github/img/logo.svg" width="160px">
    </a>
  </div>
  <p>
    <strong>Private AI for the Open Web.</strong>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/@miso.ai/client-sdk"><img src="https://img.shields.io/npm/v/@miso.ai/client-sdk"></a>
    <a href="https://www.npmjs.com/package/@miso.ai/client-sdk"><img src="https://img.shields.io/bundlephobia/minzip/@miso.ai/client-sdk"></a>
    <a href="/LICENSE"><img src="https://img.shields.io/npm/l/@miso.ai/client-sdk"></a>
  </p>
  <a href="https://miso.ai/">Home</a> | <a href="https://answers.miso.ai/">Demo</a> | <a href="https://docs.miso.ai/">Docs</a> | <a href="https://misoai.github.io/miso-client-js-sdk/answers">SDK Reference</a> | <a href="https://api.askmiso.com/">API Reference</a>
</div>

----

With LLM technology today, your users want to engage your content in smarter ways in place of the traditional keyword search. Miso offers LLM answer API services with our private models and your controlled content source.

<table>
  <tbody>
    <tr>
      <td>
        <img src=".github/img/screenshot-01.png">
      </td>
      <td>
        <img src=".github/img/screenshot-02.png">
      </td>
    </tr>
    <tr>
      <td>
        <img src=".github/img/screenshot-03.png">
      </td>
      <td>
        <img src=".github/img/screenshot-04.png">
      </td>
    </tr>
  </tbody>
</table>

// TODO: talk more

<div align="center">
  <a href="https://misoai.github.io/miso-client-js-sdk/demo/latest/answers/ask/">
    <img src=".github/img/demo.svg" width="160px">
  </a>
</div>

// TODO: diagram

### Why Miso

- Citation-driven, i.e. no AI hallucinations
- Your own AI answer engine tuned to your content
- Designed to comply with your content guidelines

### Easy to integrate

- Straightforward data upload
- Fast model training
- SDKs to integrate into your sites in 5 minutes

----

// TODO: revise this (with screenshots and code)

# Getting started

1. [Submit](https://miso.ai/get-answers) your domain to get your own private search engine.
2. Optionally add in more data to fine-tune your engine.
3. Add it to your site using our JavaScript SDK and flexible APIs.

<div align="center">
  <a href="https://stackblitz.com/github/MisoAI/miso-sdk-docs/tree/main/examples/client/1.7/ui/ask/showcase-1">
    <img src=".github/img/live-demo.svg" height="48px">
  </a>
</div>

----

# Miso JavaScript SDK

## Highlights
* Simple, easy to integrate.
* Can be added into websites by a script tag.
* UI tools for fast prototyping.
* For browser.

## Packages
This monorepo contains the following packages:

| Name | Docs | NPM | Description |
| --- | --- | --- | --- |
| [client-sdk](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk) | [Docs](https://misoai.github.io/miso-client-js-sdk/sdk/) | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk) | The standard bundle of JavaScript SDK. |
| [client-sdk-core](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk-core) | | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk-core) | The SDK core. |
| [client-sdk-ui](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk-ui) | [Docs](https://misoai.github.io/miso-client-js-sdk/ui/) | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk-ui) | A UI Plugin for fast prototyping, bundled in the standard package. |
| [client-sdk-algolia](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk-algolia) | [Docs](https://misoai.github.io/miso-client-js-sdk/plugins/algolia/) | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk-algolia) | A Plugin to integrate with InstantSearch.js and Autocomplete |
| [client-sdk-gtm](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk-gtm) | [Docs](https://misoai.github.io/miso-client-js-sdk/plugins/gtm/) | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk-gtm) | A Plugin to capture Google Tag Manager Ecommerce events |
| [client-sdk-shopify](https://github.com/MisoAI/miso-client-js-sdk/tree/main/packages/client-sdk-shopify) | [Docs](https://misoai.github.io/miso-client-js-sdk/plugins/shopify/) | [npm](https://www.npmjs.com/package/@miso.ai/client-sdk-shopify) | A prebuilt script to integrate with Shopify stores |

## Other SDKs
* [Node.js SDK](https://misoai.github.io/miso-server-js-sdk/sdk/)
* [Python SDK](https://misoai.github.io/miso-python-sdk/)

## Development
See [Development](./development.md).

## License
This library is distributed under the [MIT license](https://github.com/askmiso/miso-client-js-sdk/blob/main/LICENSE).
