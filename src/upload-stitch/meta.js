// ==UserScript==
// @name        Upload stitcher
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*/assets
// @match       *://cos.lycore.co/uploads/*/assets
// @match       *://donmai.moe/uploads/*/assets
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.1.0
// @author      TypeA2
// @description Easily stitch multi-image uploads
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/upload-stitch.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/upload-stitch.user.js
// @run-at      document-end
// ==/UserScript==

/**
 * Code here will be ignored on compilation. So it's a good place to leave messages to developers.
 *
 * - The `@grant`s used in your source code will be added automatically by `rollup-plugin-userscript`.
 *   However you have to add explicitly those used in required resources.
 * - `process.env.AUTHOR` will be loaded from `package.json`.
 */
