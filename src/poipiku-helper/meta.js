// ==UserScript==
// @name        Poipiku helper
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*
// @match       *://donmai.moe/uploads/*
// @match       *://poipiku.com/*/*.html
// @version     1.0.2
// @author      TypeA2
// @description Make uploading locked posts from Poipiku slightly less painful
// @grant       GM.getResourceUrl
// @grant       GM.addStyle
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM.deleteValue
// @grant       GM.xmlHttpRequest
// @connect     cdn.poipiku.com
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @resource    danbooru_icon https://danbooru.donmai.us/favicon.ico
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/poipiku-helper.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/poipiku-helper.user.js
// @run-at      document-end
// ==/UserScript==

/**
 * Code here will be ignored on compilation. So it's a good place to leave messages to developers.
 *
 * - The `@grant`s used in your source code will be added automatically by `rollup-plugin-userscript`.
 *   However you have to add explicitly those used in required resources.
 * - `process.env.AUTHOR` will be loaded from `package.json`.
 */
