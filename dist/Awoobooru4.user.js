// ==UserScript==
// @name        Awoobooru 4
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/*
// @match       *://cos.lycore.co/*
// @version     4.0.0b
// @author      TypeA2
// @description Various utilities to make life easier
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @require     https://cdn.jsdelivr.net/npm/panzoom@9.4.3/dist/panzoom.min.js
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/Awoobooru4.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/Awoobooru4.user.js
// @run-at      document-end
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// ==/UserScript==

(function(web,solidJs,store){'use strict';var css_248z$2 = "#awoo-tag-list{max-width:100%}.awoo-tag{margin:1px}.awoo-tag a{fill:var(--link-color)}.awoo-tag-error{padding:.2em}.awoo-tag-error:not(:last-child){border-bottom:1px solid var(--form-input-border-color)}#awoo-error-list,.awoo-tag-deprecated,.awoo-tag-error,.awoo-tag-unknown{background-color:var(--notice-error-background)}#awoo-copy-controls{display:block}#awoo-override-check-container{margin-bottom:0!important;margin-left:.5em}";class Logger {
  log(func, ...args) {
    func.apply(null, [`[${this.instance_name}]`, ...args]);
  }
  debug(...args) {
    this.log(console.debug, ...args);
  }
  info(...args) {
    this.log(console.info, ...args);
  }
  warn(...args) {
    this.log(console.warn, ...args);
  }
  error(...args) {
    this.log(console.error, ...args);
  }
  constructor(name) {
    this.instance_name = name;
  }
}var _PageManager;
let Page = /*#__PURE__*/function (Page) {
  Page[Page["UploadSingle"] = 0] = "UploadSingle";
  Page[Page["UploadMultiple"] = 1] = "UploadMultiple";
  Page[Page["ViewPost"] = 2] = "ViewPost";
  Page[Page["ViewMediaAsset"] = 3] = "ViewMediaAsset";
  Page[Page["UserFeedbacks"] = 4] = "UserFeedbacks";
  Page[Page["ViewUser"] = 5] = "ViewUser";
  Page[Page["ViewArtist"] = 6] = "ViewArtist";
  return Page;
}({});
const page_conditions = [[/^\/uploads\/\d+$/, Page.UploadSingle], [/^\/uploads\/\d+\/assets\/\d+$/, Page.UploadSingle], [path => path === "/posts" && $(".upload-image-container").length > 0, Page.UploadSingle], [/^\/uploads\/\d+\/assets$/, Page.UploadMultiple], [/^\/posts\/\d+$/, Page.ViewPost], [/^\/media_assets\/\d+$/, Page.ViewMediaAsset], [/^\/user_feedbacks$/, Page.UserFeedbacks], [/^\/users\/\d+$/, Page.ViewUser], [/^\/profile$/, Page.ViewUser], [/^\/artists\/\d+$/, Page.ViewArtist]];
class PageManager {
  static current_page() {
    return this._page;
  }
  static is_danbooru() {
    return document.location.host.endsWith("donmai.us");
  }
}
_PageManager = PageManager;
(() => {
  const path = location.pathname;
  for (const [match, page] of page_conditions) {
    if (match instanceof RegExp && path.match(match)) {
      _PageManager._page = page;
      break;
    } else if (typeof match === "function" && match(path)) {
      _PageManager._page = page;
      break;
    }
  }
})();class Feature {
  get name() {
    return this.class_name;
  }
  constructor(name) {
    this.class_name = name;
  }
}var _Options;
const logger$6 = new Logger("Options");
class Options {
  static get_value(key) {
    return JSON.parse(localStorage.getItem(key));
  }
  static set_value(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  static storage_change(e) {
    /* Not for us */
    if (!e.key.startsWith("awoo.")) {
      return;
    }
    const old_val = JSON.parse(e.oldValue);
    const new_val = JSON.parse(e.newValue);
    if (e.key in this.features) {
      if (new_val === true && old_val !== true) {
        this.features[e.key].enable();
      } else {
        this.features[e.key].disable();
      }
    } else {
      logger$6.warn(`Ignoring update for ${e.key} (newValue: ${e.newValue})`);
    }
  }
  static register_feature(path, instance) {
    const key = "awoo." + path + ".enabled";
    if (key in this.features) {
      throw new Error(`Feature already registered: ${key}`);
    }
    this.features[key] = instance;
    logger$6.info(`Registered feature ${instance.name}`);
    switch (this.get_value(key)) {
      case false:
        return false;
      case null:
        this.set_value(key, true);
      /* Default to enabled */

      /* fallthrough */

      case true:
        instance.enable();
        return true;
    }
  }
}
_Options = Options;
Options.features = {};
window.addEventListener("storage", _Options.storage_change);/* https://github.com/danbooru/danbooru/blob/a9593dda98db89576278defc06eb20650faa784d/app/logical/tag_category.rb#L16 */
const PREFIX_TO_CATEGORY = {
  gen: "general",
  general: "general",
  art: "artist",
  artist: "artist",
  co: "copyright",
  copy: "copyright",
  copyright: "copyright",
  ch: "character",
  char: "character",
  character: "character",
  meta: "meta"
};
const SHORT_PREFIX = {
  general: "gen",
  artist: "art",
  copyright: "copy",
  character: "char",
  meta: "meta"
};
const NormalTagCategories = ["artist", "copyright", "character", "general", "meta"];
const MetaTagCategories = ["rating", "parent", "child", "source", "pool", "newpool", "locked", "fav", "favgroup", "upvote", "downvote"];
const TagPrefixes = [...NormalTagCategories, ...MetaTagCategories, ...Object.values(SHORT_PREFIX)];
const CATEGORY_TO_NAME = {
  "0": "general",
  "1": "artist",
  "3": "copyright",
  "4": "character",
  "5": "meta"
};
function sanitize_tag_string(tags) {
  return tags.split(/([\s\n])/).map(tag => tag.toLowerCase()).filter(s => /\S/.test(s)).sort();
}
class Tag {
  constructor(tag_string) {
    this._tag_string = tag_string;
  }
  toString() {
    return this.tag_string();
  }

  /* Full name to be used in the tag string */
  tag_string() {
    return this._tag_string;
  }

  /* Used to check for uniqueness, discarding any modifiers */

  /* Friendly display name */

  /* Prefix-less tagname */

  /* Properties applied to the tag */
}
class PendingTag extends Tag {
  constructor(tag) {
    super(tag);
  }
  unique_name() {
    return this.tag_string();
  }
  display_name() {
    return this.tag_string();
  }
  search_string() {
    return this.tag_string();
  }
  render_settings() {
    return {
      class_string: "awoo-tag-pending",
      can_remove: true,
      properties: {}
    };
  }
  as_not_found() {
    return new NotFoundTag(this.tag_string());
  }
}
class NotFoundTag extends Tag {
  constructor(tag) {
    super(tag);
  }
  unique_name() {
    return this.tag_string();
  }
  display_name() {
    return this.tag_string();
  }
  search_string() {
    return this.tag_string();
  }
  render_settings() {
    return {
      class_string: "awoo-tag-unknown",
      can_remove: true,
      properties: {}
    };
  }
}
class FullDataTag extends Tag {
  get category() {
    return this.__category;
  }
  get deprecated() {
    return this.__deprecated;
  }
  constructor(name, category, is_deprecated) {
    super(name);
    this.__category = category;
    this.__deprecated = is_deprecated;
  }
  unique_name() {
    return this.tag_string();
  }
  display_name() {
    return this.tag_string();
  }
  search_string() {
    return this.tag_string();
  }
  render_settings() {
    return {
      class_string: `awoo-tag-${this.category} ${this.deprecated ? "awoo-tag-deprecated" : ""}`,
      can_remove: true,
      properties: {
        "data-tag-category": this.category,
        "data-tag-is-deprecated": this.deprecated ? "true" : "false"
      }
    };
  }
}
class NewTag extends Tag {
  get category() {
    return this._category;
  }
  get tag() {
    return this._tag;
  }
  constructor(category, tag) {
    super(category + ":" + tag);
    this._category = PREFIX_TO_CATEGORY[category];
    this._tag = tag;
  }
  unique_name() {
    return this.tag;
  }
  display_name() {
    /* Don't show prefix on current artist */
    if (this.tag === $(".source-data-content a.tag-type-1").text()) {
      return this.tag;
    }
    return this.category + ":" + this.tag;
  }
  search_string() {
    return this.tag;
  }
  render_settings() {
    return {
      class_string: `awoo-tag-${this.category}`,
      can_remove: true,
      properties: {
        "data-category": this.category
      }
    };
  }
}
class MetaTag extends Tag {
  get kind() {
    return this._kind;
  }
  get value() {
    return this._value;
  }
  constructor(kind, value) {
    super(kind + ":" + value);
    this._kind = kind;
    this._value = value;
  }
  unique_name() {
    switch (this.kind) {
      /* These can appear multiple times */
      case "child":
      case "pool":
      case "newpool":
      case "favgroup":
        return this.kind + ":" + this.value;
    }
    return this.kind;
  }
  display_name() {
    switch (this.kind) {
      case "rating":
        return `${this.kind}:${this.value[0]}`;
    }
    return this.kind + ":" + this.value;
  }
  search_string() {
    return this.tag_string();
  }
  render_settings() {
    return {
      class_string: "awoo-tag-meta-tag",
      can_remove: this.kind !== "rating",
      properties: {
        "data-meta-category": this.kind,
        "data-meta-value": this.value
      }
    };
  }
}function* array_chunks(arr, n) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}var _TagRegistry;
const logger$5 = new Logger("TagRegistry");
class TagRegistry {
  constructor() {}
  static parse_tag(tag) {
    if (tag.indexOf(":") > 1 && TagPrefixes.includes(tag.split(":", 1)[0])) {
      const [prefix, name] = tag.split(":");
      if (prefix in PREFIX_TO_CATEGORY) {
        return new NewTag(prefix, name);
      } else if (MetaTagCategories.includes(prefix)) {
        switch (prefix) {
          case "rating":
            if (!"gsqe".includes(name[0])) {
              return null;
            }
            break;
          case "parent":
          case "child":
            if (!/^\d+$/.test(name)) {
              return null;
            }
            break;
        }
        return new MetaTag(prefix, name);
      }
      return null;
    }
    if (this.has_tag(tag)) {
      return this.get_tag(tag);
    }
    return new PendingTag(tag);
  }
  static has_tag(tag) {
    return Object.prototype.hasOwnProperty.call(this._known_tags, tag);
  }
  static _store_tag(tag) {
    this._known_tags[tag.unique_name()] = tag;
  }
  static store_tag(tag) {
    logger$5.info("Storing", tag.tag_string(), tag);
    this._store_tag(tag);
  }
  static store_tags(tags) {
    logger$5.info("Storing", tags.map(t => t.tag_string()).join(", "));
    tags.map(t => this._store_tag(t));
  }
  static get_tag(tag) {
    return this._known_tags[tag];
  }
  static async resolve_pending(cb) {
    const tags = new Map(Object.entries(this._known_tags).filter(([_, t]) => t instanceof PendingTag));
    if (tags.size === 0) {
      {
        return;
      }
    }
    logger$5.info("Resolving pending tags:", [...tags.keys()].join(", "));
    const result = [];
    for (const chunk of array_chunks([...tags.values().map(t => t.unique_name())], 1000)) {
      const found_tags = await this._search_tags(chunk);
      if (found_tags.length > 0) {
        logger$5.info("Found", found_tags.map(t => t.tag_string()).join(", "));
      }
      result.push(...found_tags);
      for (const tag of found_tags) {
        tags.delete(tag.unique_name());
        this._store_tag(tag);
      }
    }
    if (tags.size > 0) {
      logger$5.info("Didn't find", [...tags.values()].map(t => t.tag_string()).join(", "));
    }
    for (const [_, tag] of tags) {
      const nf = tag.as_not_found();
      this._store_tag(nf);
      result.push(nf);
    }
    cb(result);
  }
  static async _search_tags(tags) {
    const PAGE_SIZE = 1000;
    if (tags.length > 1000) {
      throw new Error(`Exceeding page size: ${tags.length} > ${PAGE_SIZE}`);
    }
    const request_data = {
      limit: PAGE_SIZE,
      search: {
        name: tags,
        hide_empty: true
      },
      only: "id,name,is_deprecated,category",
      _method: "get"
    };
    logger$5.debug("POST /tags.json", request_data);
    const res = await $.ajax(`/tags.json`, {
      method: "POST",
      dataType: "json",
      data: request_data
    });
    return res.map(data => new FullDataTag(data.name, CATEGORY_TO_NAME[data.category.toString()], data.is_deprecated));
  }
}
_TagRegistry = TagRegistry;
TagRegistry._known_tags = {};
(() => {
  switch (PageManager.current_page()) {
    case Page.ViewPost:
      {
        const tags = [...$("#tag-list li[data-tag-name][data-is-deprecated]")];
        logger$5.info("Gathering", tags.map(li => li.dataset.tagName).join(", "));
        for (const li of tags) {
          for (const cls of li.classList) {
            if (cls.startsWith("tag-type-")) {
              _TagRegistry._store_tag(new FullDataTag(li.dataset.tagName, CATEGORY_TO_NAME[cls.slice(cls.length - 1)], li.dataset.isDeprecated === "true"));
              break;
            }
          }
        }
      }
  }
})();const RESOLVE_DELAY = 500;
class TagList {
  constructor() {
    this._state = store.createStore({});
    setInterval(() => TagRegistry.resolve_pending(tags => {
      solidJs.batch(() => {
        tags.forEach(tag => this._store_tag(tag));
      });
    }), RESOLVE_DELAY);
  }
  _has_tag(tag) {
    return Object.prototype.hasOwnProperty.call(this._state[0], tag);
  }
  _store_tag(tag) {
    this._state[1](tag.unique_name(), tag);
  }
  _remove_tag(tag) {
    this._state[1](tag.unique_name(), undefined);
  }
  get length() {
    return Object.keys(this._state[0]).length;
  }
  contains(tag) {
    return Object.prototype.hasOwnProperty.call(this._state[0], tag);
  }
  get(tag) {
    return this._state[0][tag];
  }
  filter(cond) {
    return Object.values(this._state[0]).filter(cond);
  }
  has(cond) {
    for (const tag of Object.values(this._state[0])) {
      if (cond(tag)) {
        return true;
      }
    }
    return false;
  }
  clear() {
    for (const tag of Object.values(this._state[0])) {
      this._remove_tag(tag);
    }
  }
  add_tag(tag) {
    this.add_tags([tag]);
  }
  add_tags(tags) {
    TagRegistry.store_tags(tags);
    tags.map(t => this._store_tag(t));
  }
  remove_tag(tag) {
    this._remove_tag(tag);
  }
  remove_tags(tags) {
    tags.forEach(tag => this._remove_tag(tag));
  }
  has_tag(tag) {
    return this._has_tag(tag);
  }
  count_for_category(category) {
    let count = 0;
    for (const tag of Object.values(this._state[0])) {
      if (tag instanceof NewTag || tag instanceof FullDataTag) {
        if (tag.category === category) {
          count += 1;
        }
      }
    }
    return count;
  }
  get tags() {
    return Object.values(this._state[0]);
  }
  get tag_names() {
    return Object.values(this._state[0]).map(t => t.tag_string());
  }
  get tag_string() {
    return this.tag_names.join(" ");
  }
  has_pending() {
    for (const tag of Object.values(this._state[0])) {
      if (tag instanceof NotFoundTag || tag instanceof PendingTag) {
        return true;
      }
    }
    return false;
  }
  has_deprecated() {
    for (const tag of Object.values(this._state[0])) {
      if (tag instanceof FullDataTag && tag.deprecated) {
        return true;
      }
    }
    return false;
  }
}const DEFAULT_REPLACEMENTS = [{
  type: "regex",
  search: "(?<=.+[_|-])shrit",
  replace: "shirt"
}, {
  type: "regex",
  search: "(?<!t)-(?=shirt)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+[_|-])skrit",
  replace: "skirt"
}, {
  type: "regex",
  search: "(?<!half)-(?=skirt)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+[_|-])naisl",
  replace: "nails"
}, {
  type: "regex",
  search: "(?<=.+)-(?=nails)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=sweater)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+[_|-])shrots",
  replace: "shorts"
}, {
  type: "regex",
  search: "(?<=.+)-(?=shorts)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=eyes)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=hair)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=dress)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=jacket)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=ribbon)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=hat)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=necktie)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=(.+){2,})-(?=bow)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=brooch)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=belt)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=cardigan)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=corset)",
  replace: "_"
}, {
  type: "regex",
  search: "(?<=.+)-(?=coat)",
  replace: "_"
}, {
  type: "regex",
  search: "colalred(?=[_|-].+)",
  replace: "collared"
}, {
  type: "regex",
  search: "(?<=.+[_|-])haiar",
  replace: "hair"
}, {
  type: "regex",
  search: "(?<=.+[_|-])hairl",
  replace: "hair"
}, {
  type: "regex",
  search: "(?<=.+[_|-])eyesl",
  replace: "eyes"
}, {
  type: "regex",
  search: "(?<=.+[_|-])eys",
  replace: "eyes"
}, {
  type: "regex",
  search: "(?<=.+[_|-])flwoer",
  replace: "flower"
}, {
  type: "regex",
  search: "(?<=.+[_|-])choekr",
  replace: "choker"
}, {
  type: "regex",
  search: "(?<=.+[_|-])ribobn",
  replace: "ribbon"
}, {
  type: "regex",
  search: "blakc(?=[_|-].+)",
  replace: "black"
}, {
  type: "simple",
  search: "outdoros",
  replace: "outdoors"
}, {
  type: "simple",
  search: "colalred_shirt",
  replace: "collared_shirt"
}, {
  type: "simple",
  search: "earrinsg",
  replace: "earrings"
}, {
  type: "simple",
  search: "sweatdorp",
  replace: "sweatdrop"
}, {
  type: "simple",
  search: "tongue-out",
  replace: "tongue_out"
}, {
  type: "simple",
  search: "character-name",
  replace: "character_name"
}, {
  type: "simple",
  search: "thigh-strap",
  replace: "thigh_strap"
}, {
  type: "simple",
  search: "anger-vein",
  replace: "anger_vein"
}, {
  type: "simple",
  search: "bleu_eyes",
  replace: "blue_eyes"
}, {
  type: "simple",
  search: "hicket",
  replace: "hickey"
}, {
  type: "simple",
  search: "colared_shirt",
  replace: "collared_shirt"
}, {
  type: "simple",
  search: "lbush",
  replace: "blush"
}, {
  type: "simple",
  search: "cat_eras",
  replace: "cat_ears"
}, {
  type: "simple",
  search: "ponytial",
  replace: "ponytail"
}, {
  type: "simple",
  search: "sidelocsk",
  replace: "sidelocks"
}, {
  type: "simple",
  search: "film-grain",
  replace: "film_grain"
}, {
  type: "simple",
  search: "holding_phoen",
  replace: "holding_phone"
}];
class Autocorrect {
  static correct_tag(tag) {
    for (const {
      type,
      search,
      replace
    } of DEFAULT_REPLACEMENTS) {
      switch (type) {
        case "simple":
          {
            if (tag === search) {
              return [replace, true];
            }
            break;
          }
        case "regex":
          {
            const regex = new RegExp(search, "i");
            if (regex.test(tag)) {
              return [tag.replace(regex, replace), true];
            }
            break;
          }
      }
    }
    return [tag, false];
  }
}var _tmpl$$3 = /*#__PURE__*/web.template(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 512 512"class="icon svg-icon"><path d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9\n                88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9\n                390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7\n                16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8\n                222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1\n                17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7\n                31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1\n                401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4\n                88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24\n                10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1\n                17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z">`),
  _tmpl$2$2 = /*#__PURE__*/web.template(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 384 512"class="icon svg-icon"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192\n                210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7\n                256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3\n                297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z">`),
  _tmpl$3$2 = /*#__PURE__*/web.template(`<input type=text id=awoo-tag-box>`),
  _tmpl$4$2 = /*#__PURE__*/web.template(`<span id=awoo-copy-controls><a href=#>Copy tags</a>&nbsp;-&nbsp;<a href=#>Paste tags`),
  _tmpl$5$1 = /*#__PURE__*/web.template(`<hr>`),
  _tmpl$6$1 = /*#__PURE__*/web.template(`<div id=awoo-error-list class="p-2 h-fit space-y-t card"><ul>`),
  _tmpl$7 = /*#__PURE__*/web.template(`<div id=awoo-tag-list class="p-2 h-fit space-y-1 card"><ul>`),
  _tmpl$8 = /*#__PURE__*/web.template(`<li class=awoo-tag-error>`),
  _tmpl$9 = /*#__PURE__*/web.template(`<a href=#>`),
  _tmpl$10 = /*#__PURE__*/web.template(`<a target=_blank>`),
  _tmpl$11 = /*#__PURE__*/web.template(`<div class="input boolean optional inline-block"id=awoo-override-check-container><input class="boolean optional"type=checkbox id=awoo-override-check><label class="boolean optional"for=awoo-override-check>Skip check`);
const logger$4 = new Logger("BetterTagBox");
const EDIT_ICON = () => _tmpl$$3().cloneNode(true);
const DELETE_ICON = () => _tmpl$2$2().cloneNode(true);
const CATEGORY_TO_ID = {
  general: 0,
  artist: 1,
  copyright: 3,
  character: 4,
  meta: 5
};
function node_is_html(node) {
  return node.nodeType === Node.ELEMENT_NODE;
}
const GIRL_CHARCOUNTERS = new Set(["1girl", "2girls", "3girls", "4girls", "5girls", "6+girls"]);
const BOY_CHARCOUNTERS = new Set(["1boy", "2boys", "3boys", "4boys", "5boys", "6+boys"]);
const OTHER_CHARCOUNTERS = new Set(["1other", "2others", "3others", "4others", "5others", "6+others"]);
const MUTUALLY_EXCLUSIVE = [GIRL_CHARCOUNTERS, BOY_CHARCOUNTERS, OTHER_CHARCOUNTERS].map(e => new Set(e));
class BetterTagBoxFeature extends Feature {
  constructor() {
    super("BetterTagBox");
    this._history = [];
    Options.register_feature("BetterTagBox", this);
  }
  get _tag_box_value() {
    /* Normalized */
    return $("#awoo-tag-box").val().toLowerCase().trim().replace(" ", "_");
  }
  set _tag_box_value(val) {
    $("#awoo-tag-box").val(val);
  }
  _can_submit() {
    let ret = true;
    const notice = [];
    const error_tags = new Set();

    /// Has rating
    if ($("input[name='post[rating]']:checked").length === 0) {
      ret = false;
      notice.push("No rating");
    }
    ///

    /// Has tags at all
    if (this.tag_list.length === 0) {
      ret = false;
      notice.push("No tags");
    }
    ///

    /// Has deprecated, pending, unknown tags
    const deprecated_tags = [];
    const pending_tags = [];
    const unknown_tags = [];
    for (const tag of this.tag_list.tags) {
      if (tag instanceof FullDataTag && tag.deprecated) {
        deprecated_tags.push(tag.display_name());
      } else if (tag instanceof PendingTag) {
        pending_tags.push(tag.display_name());
      } else if (tag instanceof NotFoundTag) {
        unknown_tags.push(tag.display_name());
      }
    }
    ret && (ret = deprecated_tags.length === 0 && pending_tags.length === 0 && unknown_tags.length === 0);
    if (deprecated_tags.length > 0) notice.push(`Deprecated: ${deprecated_tags.join(", ")}`);
    // This would be annoying
    // if (   pending_tags.length > 0) notice.push(`Pending: ${pending_tags.join(", ")}`);
    if (unknown_tags.length > 0) notice.push(`Unknown: ${unknown_tags.join(", ")}`);
    ///

    /// No artist tag if required
    if (this.tag_list.count_for_category("artist") === 0) {
      if (!this.tag_list.has_tag("artist_request") && !this.tag_list.has_tag("official_art")) {
        notice.push("No artist");
        ret = false;
      }
    }
    ///

    /// No copyright tags
    if (this.tag_list.count_for_category("copyright") === 0 && !this.tag_list.has_tag("copyright_request")) {
      notice.push("No copyright");
      ret = false;
    }
    ///

    /// No mutually exclusive tags
    const tags = new Set(this.tag_list.tag_names);
    for (const group of MUTUALLY_EXCLUSIVE) {
      const matches = [];
      for (const tag of tags) {
        if (group.has(tag)) {
          matches.push(tag);
        }
      }
      if (matches.length > 1) {
        notice.push(`Conflicting tags: ${matches.sort().join(", ")}`);
        matches.forEach(match => error_tags.add(match));
      }
    }
    ///

    /// No charcounters
    if (!tags.has("no_humans") && [...tags].filter(t => GIRL_CHARCOUNTERS.has(t) || BOY_CHARCOUNTERS.has(t) || OTHER_CHARCOUNTERS.has(t)).length === 0) {
      ret = false;
      notice.push("No charcounters");
    }
    ///

    /// No commentary tags despite being applicable
    if (!tags.has("commentary") && !tags.has("commentary_request") && !tags.has("symbol-only_commentary") && ($("#post_artist_commentary_title").val() || $("#post_artist_commentary_desc").val())) {
      ret = false;
      const commentary = ($("#post_artist_commentary_title").val() + $("#post_artist_commentary_desc").val()).trim();
      notice.push(`No commentary tags: "${commentary.slice(0, 10)}${commentary.length > 10 ? "..." : ""}"`);
    }
    if (($("#post_translated_commentary_title").val() || $("#post_translated_commentary_desc").val()) && !tags.has("commentary") && !tags.has("partial_commentary")) {
      ret = false;
      notice.push("No (partial) commentary tag");
    }
    ///

    this._set_notice(notice);
    this._set_error_tags(error_tags);
    return ret;
  }
  _update_selected_tags() {
    $(".related-tags li").each((_, el) => {
      const li = $(el);
      const tag_name = li.find("a[data-tag-name]").data("tag-name");
      if (this.tag_list.has(t => t.search_string() === tag_name)) {
        logger$4.debug("Selecting", li.find("a[data-tag-name]"));
        li.addClass("selected").find("input").prop("checked", true);
      } else {
        li.removeClass("selected").find("input").prop("checked", false);
      }
    });
  }
  _tag_list_updated() {
    $("#post_tag_string").val(this.tag_list.tag_string).trigger("input.$");
    this._update_selected_tags();

    // logger.info("New tag string:", this.tag_list.tag_string);

    /* Apply tags that do things */
    if (this.tag_list.contains("rating")) {
      const tag = this.tag_list.get("rating");
      const rating = tag.value[0];
      $(`#post_rating_${rating}`).prop("checked", true);
    }
    if (this.tag_list.contains("parent")) {
      const tag = this.tag_list.get("parent");
      $("#post_parent_id").val(tag.value);
    } else {
      if ($("#post_parent_id").val()) {
        $("#post_parent_id").val("");
      }
    }
    const submit_btn = $("#form input[type='submit']");
    const can_submit = $("#awoo-override-check").is(":checked") || this._can_submit();
    submit_btn.prop("disabled", !can_submit);
    if (can_submit && submit_btn.attr("data-submit-queued") === "true") {
      submit_btn.click();
    } else {
      submit_btn.removeAttr("data-submit-queued");
    }
  }
  _tag_box_keydown(e) {
    switch (e.key) {
      case "Enter":
        if (e.ctrlKey) {
          e.preventDefault();
          const submit_btn = $("#form input[type='submit']");
          if (submit_btn.prop("disabled")) {
            submit_btn.attr("data-submit-queued", "true");
          } else {
            submit_btn.click();
          }
          return;
        }

      /* Fallthrough */

      case " ":
        e.preventDefault();
        this._try_add_tag(this._tag_box_value);
        break;
      case "ArrowLeft":
      case "Backspace":
        if (!this._tag_box_value && e.target.selectionStart === 0) {
          e.preventDefault();
          this._try_undo(e.key === "Backspace");
        }
        break;
    }
  }
  _try_undo(select) {
    if (this._history.length === 0) {
      return;
    }
    const last = this._history.pop();
    let tag = last.tag.display_name();
    if (last.action === "remove") {
      tag = "-" + tag;
    }
    this.tag_list.remove_tag(last.tag);
    $("#awoo-tag-box").val(tag);
    if (select) {
      $("#awoo-tag-box").select();
    }
  }
  _try_add_tag(tag) {
    if (!tag) {
      return;
    }
    const is_negated = tag[0] === "-";
    if (!is_negated) {
      [tag] = Autocorrect.correct_tag(tag);
    }
    const parsed = TagRegistry.parse_tag(is_negated ? tag.slice(1) : tag);
    if (!parsed) {
      /* Can't parse it, what to do? */
      $("#awoo-tag-box").parent().addClass("field_with_errors");
      $("#awoo-tag-box").one("input", e => e.target.parentElement.classList.remove("field_with_errors"));
      return;
    }
    $("#awoo-tag-box").parent().removeClass("field_with_errors");
    if (is_negated) {
      if (parsed.render_settings().can_remove) {
        logger$4.info("Removing:", parsed.tag_string());
        this.tag_list.remove_tag(parsed);
        this._history.push({
          tag: parsed,
          action: "remove"
        });
      }
    } else {
      logger$4.info("Adding:", parsed.tag_string());
      this.tag_list.add_tag(parsed);
      this._history.push({
        tag: parsed,
        action: "add"
      });
    }
    this._tag_box_value = "";
  }
  _set_tag_string(tags) {
    // this.tag_list.clear();

    const mapping = new Map();
    for (let tag of sanitize_tag_string(tags)) {
      const is_negated = tag[0] === "-";
      if (!is_negated) {
        [tag] = Autocorrect.correct_tag(tag);
      }
      const parsed = TagRegistry.parse_tag(is_negated ? tag.slice(1) : tag) || new NotFoundTag(tag);
      if (is_negated) {
        mapping.delete(parsed.unique_name());
      } else {
        mapping.set(parsed.unique_name(), parsed);
      }
    }
    this.tag_list.add_tags([...mapping.values()]);
  }
  _edit_tag(tag) {
    this.tag_list.remove_tag(tag);
    const value = tag.tag_string();
    const tag_box = $("#awoo-tag-box");
    tag_box.val(value);
    tag_box.select();
    tag_box[0].setSelectionRange(value.length, value.length);
    tag_box.autocomplete("search", value);
  }
  async _commentary_changed() {
    const source_title = $("#post_artist_commentary_title").val();
    const source_description = $("#post_artist_commentary_desc").val();

    /* Check for hashtag-only */
    let hashtag_only = true;
    if (source_title || !source_description) {
      hashtag_only = false;
    }
    if (hashtag_only) {
      const res = await $.ajax("/dtext_preview", {
        method: "POST",
        dataType: "html",
        data: {
          body: source_description,
          disable_mentions: true,
          media_embeds: false
        }
      });
      const html = $(`<div>${res}</div>`);
      const walker = document.createTreeWalker(html[0], NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_ALL, node => {
        if (node_is_html(node)) {
          if (node.tagName === "A" && node.innerText[0] === "#") {
            /* Skip hashtag links */
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      });
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node_is_html(node)) {
          if (node.wholeText.trim()) {
            /* Non-hashtag text */
            hashtag_only = false;
            break;
          }
        }
      }
    }
    const commentary_tags = ["commentary", "hashtag-only_commentary"];
    logger$4.info("Hashtag-only:", hashtag_only);
    if (hashtag_only) {
      this.tag_list.add_tags(commentary_tags.map(t => TagRegistry.parse_tag(t)));
    } else {
      this.tag_list.remove_tags(commentary_tags.map(t => TagRegistry.parse_tag(t)));
    }
    this._tag_list_updated();
  }
  make_tag_box() {
    const callback_builder = category => t => (t instanceof FullDataTag && !t.deprecated || t instanceof NewTag) && t.category === category;
    const callbacks = [...NormalTagCategories.map(callback_builder), t => t instanceof MetaTag, t => t instanceof PendingTag, t => t instanceof FullDataTag && t.deprecated, t => t instanceof NotFoundTag];
    const _self$ = this;
    return [(() => {
      var _el$3 = _tmpl$3$2();
      _el$3.$$keydown = e => {
        _self$._tag_box_keydown(e);
      };
      return _el$3;
    })(), (() => {
      var _el$4 = _tmpl$4$2(),
        _el$5 = _el$4.firstChild,
        _el$6 = _el$5.nextSibling,
        _el$7 = _el$6.nextSibling;
      _el$5.$$click = async e => {
        await navigator.clipboard.writeText(_self$.tag_list.tag_string);
        Danbooru.Utility.notice("Tags copied", false);
        $(e.target).blur();
      };
      _el$7.$$click = async e => {
        _self$._set_tag_string(await navigator.clipboard.readText());
        Danbooru.Utility.notice("Tags pasted", false);
        $(e.target).blur();
      };
      return _el$4;
    })(), _tmpl$5$1(), web.createComponent(solidJs.Show, {
      get when() {
        return _self$._notice().length > 0;
      },
      get children() {
        return [(() => {
          var _el$9 = _tmpl$6$1(),
            _el$10 = _el$9.firstChild;
          web.insert(_el$10, web.createComponent(solidJs.For, {
            get each() {
              return _self$._notice();
            },
            children: msg => (() => {
              var _el$14 = _tmpl$8();
              web.insert(_el$14, msg);
              return _el$14;
            })()
          }));
          return _el$9;
        })(), _tmpl$5$1()];
      }
    }), (() => {
      var _el$12 = _tmpl$7(),
        _el$13 = _el$12.firstChild;
      web.insert(_el$13, web.createComponent(solidJs.For, {
        each: callbacks,
        children: cb => web.createComponent(solidJs.For, {
          get each() {
            return _self$.tag_list.filter(cb).sort();
          },
          children: tag => {
            const settings = tag.render_settings();
            return web.createComponent(web.Dynamic, web.mergeProps({
              component: "li",
              get ["class"]() {
                return `awoo-tag ${settings.class_string} ${_self$._error_tags().has(tag.tag_string()) ? "awoo-tag-error" : ""}`;
              },
              get ["data-tag-string"]() {
                return tag.tag_string();
              },
              get ["data-unique-name"]() {
                return tag.unique_name();
              },
              get ["data-display-name"]() {
                return tag.display_name();
              },
              get ["data-base-name"]() {
                return tag.search_string();
              }
            }, () => settings.properties, {
              get children() {
                return [web.createComponent(solidJs.Show, {
                  get when() {
                    return settings.can_remove;
                  },
                  fallback: "\xA0\xA0\xA0\xA0\xA0\xA0\xA0",
                  get children() {
                    return [(() => {
                      var _el$15 = _tmpl$9();
                      web.addEventListener(_el$15, "click", e => {
                        e.preventDefault();
                        _self$.tag_list.remove_tag(tag);
                      });
                      web.insert(_el$15, DELETE_ICON);
                      web.effect(() => web.setAttribute(_el$15, "title", `Remove "${tag.display_name()}"`));
                      return _el$15;
                    })(), "\xA0", (() => {
                      var _el$16 = _tmpl$9();
                      web.addEventListener(_el$16, "click", e => {
                        e.preventDefault();
                        _self$._edit_tag(tag);
                      });
                      web.insert(_el$16, EDIT_ICON);
                      web.effect(() => web.setAttribute(_el$16, "title", `Edit "${tag.display_name()}"`));
                      return _el$16;
                    })(), "\xA0"];
                  }
                }), web.createComponent(solidJs.Show, {
                  when: tag instanceof NewTag || tag instanceof FullDataTag,
                  get fallback() {
                    return (() => {
                      var _el$18 = _tmpl$10();
                      web.insert(_el$18, () => tag.display_name());
                      web.effect(() => web.setAttribute(_el$18, "href", `/posts?tags=${tag.search_string()}`));
                      return _el$18;
                    })();
                  },
                  get children() {
                    var _el$17 = _tmpl$10();
                    web.insert(_el$17, () => tag.display_name());
                    web.effect(_p$ => {
                      var _v$ = `/posts?tags=${tag.search_string()}`,
                        _v$2 = `tag-type-${CATEGORY_TO_ID[tag.category]}`;
                      _v$ !== _p$.e && web.setAttribute(_el$17, "href", _p$.e = _v$);
                      _v$2 !== _p$.t && web.className(_el$17, _p$.t = _v$2);
                      return _p$;
                    }, {
                      e: undefined,
                      t: undefined
                    });
                    return _el$17;
                  }
                })];
              }
            }));
          }
        })
      }));
      return _el$12;
    })()];
  }
  async _autocomplete_source(query) {
    const is_negated = query[0] === "-";
    const res = await $.get("/autocomplete", {
      "search[query]": is_negated ? query.slice(1) : query,
      "search[type]": "tag_query",
      "version": "1",
      "limit": "20"
    });
    const items = $(res).find("li").toArray().map(e => $(e));
    items.forEach(e => e.data("original-query", query).data("is-negated", is_negated));
    return items;
  }
  enable() {
    logger$4.info("Enabling");
    const _this = this;
    $.widget("ui.autocomplete", $.ui.autocomplete, {
      options: {
        delay: 0,
        minLength: 1,
        autoFocus: false,
        focus: () => false
      },
      _create: function () {
        this.element.on("keydown.Autocomplete.tab", null, "tab", function (e) {
          const input = $(this);
          const instance = input.autocomplete("instance");
          const menu = instance.menu.element;

          /* Not actually doing autocomplete */
          if (!menu.is(":visible")) {
            logger$4.info("Autocomplete not visible");
            _this._try_add_tag(_this._tag_box_value);
            e.preventDefault();
            return;
          }

          /* Autocomplete is open but nothing in focus -> select first one */
          if (menu.has(".ui-state-active").length === 0) {
            const first = menu.find(".ui-menu-item").first();
            const value = first.data("autocomplete-value");
            const sanitize = s => s.toLowerCase().trim().replaceAll(" ", "_");
            const original_query = sanitize(first.data("original-query"));
            //const current_query = sanitize($("#awoo-tag-box").val() as string);

            const is_negated = original_query[0] === "-";
            input.autocomplete("close");
            _this._try_add_tag((is_negated ? "-" : "") + value);
          }
          e.preventDefault();
        });
        this._super();
      },
      _renderItem: (list, item) => {
        item.data("ui-autocomplete-item", item);
        return list.append(item);
      }
    });
    Danbooru.RelatedTag.update_selected = _ => this._update_selected_tags();
    const initial_tags = sanitize_tag_string($("#post_tag_string").val() || "");
    const initial_parent = $("#post_parent_id").val();
    if (initial_parent) {
      initial_tags.push(`parent:${initial_parent}`);
    }
    const initial_rating = $("#form input[name='post[rating]']:checked").val();
    if (initial_rating) {
      initial_tags.push(`rating:${initial_rating}`);
    }
    this.tag_list = new TagList();

    // eslint-disable-next-line solid/reactivity
    [this._error_tags, this._set_error_tags] = solidJs.createSignal(new Set());

    // eslint-disable-next-line solid/reactivity
    [this._notice, this._set_notice] = solidJs.createSignal([]);
    solidJs.createEffect(() => this._tag_list_updated());
    this._set_tag_string(initial_tags.map(tag => {
      if (tag === $(".source-data-content a.tag-type-1").text()) {
        return `artist:${tag}`;
      }
      return tag;
    }).join(" "));
    web.render(() => this.make_tag_box.bind(this), document.getElementById("post_tag_string").parentElement);

    /* Re-implement autocomplete to have more control */
    $("#awoo-tag-box").autocomplete({
      select: (_, ui) => {
        const el = ui.item;
        $("#awoo-tag-box").val((el.data("is-negated") ? "-" : "") + el.data("autocomplete-value"));
        this._try_add_tag(this._tag_box_value);
      },
      source: async (req, res) => {
        res(await this._autocomplete_source(req.term));
      }
    });
    try {
      $("#post_tag_string").removeAttr("data-autocomplete").css("display", "none").autocomplete("destroy");
    } catch (_unused) {
      /* May throw since autocomplete may not be initialized yet, just ignore */
    }
    $("#post_tag_string").data("uiAutocomplete", {
      close: () => {}
    });
    $("label[for='post_tag_string']").attr("for", "awoo-tag-box");
    $(".post_tag_string .hint").css("display", "none");
    $("#post_parent_id").on("input", e => {
      this._try_add_tag(`parent:${$(e.target).val()}`);
      this._tag_list_updated();
    });
    $("#form input[name='post[rating]']").on("click", e => {
      this._try_add_tag(`rating:${$(e.target).val()}`);
      this._tag_list_updated();
    });
    $("#post_tag_string").on("input.danbooru", e => {
      /* Replace tags by a different value */
      //this.tag_list.clear();
      this._set_tag_string($(e.target).val());
    });
    const _self$2 = this;
    $("#form input[type='submit']").after((() => {
      var _el$19 = _tmpl$11(),
        _el$20 = _el$19.firstChild;
      web.addEventListener(_el$20, "change", _ => _self$2._tag_list_updated());
      return _el$19;
    })());
    $(document).one("danbooru:show-related-tags", _ => this._update_selected_tags());
    switch (PageManager.current_page()) {
      case Page.UploadSingle:
        {
          $("#awoo-tag-box").focus();

          /* Non-web sources don't have source data */
          if ($(".source-data").length > 0) {
            new MutationObserver(_ => {
              this._commentary_changed();
            }).observe($(".source-data")[0].parentElement, {
              childList: true
            });
            $("#post_artist_commentary_title,#post_artist_commentary_desc").on("change", _ => this._commentary_changed());
          }
          break;
        }
      case Page.ViewPost:
        {
          new MutationObserver(_ => {
            if ($("#edit").is(":visible")) {
              $("#awoo-tag-box").focus();
            }
          }).observe($("#edit")[0], {
            attributes: true,
            attributeFilter: ["style"]
          });
          break;
        }
    }
  }
  disable() {
    logger$4.info("Disabling");
  }
}
web.delegateEvents(["keydown", "click"]);var _tmpl$$2 = /*#__PURE__*/web.template(`<span> Tags copied. Please check the `),
  _tmpl$2$1 = /*#__PURE__*/web.template(`<a class=tag-type-5 href=/wiki_pages/commentary target=_blank>commentary`),
  _tmpl$3$1 = /*#__PURE__*/web.template(`<span> and `),
  _tmpl$4$1 = /*#__PURE__*/web.template(`<a class=tag-type-5 href=/wiki_pages/translation_request target=_blank>translation`),
  _tmpl$5 = /*#__PURE__*/web.template(`<span> tags.`),
  _tmpl$6 = /*#__PURE__*/web.template(`<div>Make: <a class=awoo-link href=#>parent</a><span class=awoo-sep> | </span><a class=awoo-link href=#>nth child</a><span class=awoo-sep> | </span><a class=awoo-link href=#>child`);
const logger$3 = new Logger("OneUp");
const DO_NOT_COPY_LIST = ["corrupted_twitter_file", "md5_mismatch", "resolution_mismatch", "bad_id", "bad_link", "bad_source", "resized", "resolution_mismatch", "source_larger", "source_smaller", "duplicate", "pixel-perfect_duplicate", /* Auto-added */
"lowres", "highres", "absurdres", "incredibly_absurdres", "wide_image", "tall_image", "animated_gif", "animated_png", "flash", "video", "ugoira", "exif_rotation", "non-repeating_animation", "sound", "non-web_source"];
class OneUpFeature extends Feature {
  constructor() {
    super("OneUp");
    Options.register_feature("oneup", this);
  }
  copy_tags(data, e) {
    if (data.mode === "another_child") {
      $("#post_tag_string").val($("#post_tag_string").val() + ` child:${data.post.dataset.id}`);
      $("#post_tag_string").trigger("input");

      /* This isn't actually a component, eslint */
      // eslint-disable-next-line solid/components-return-once
      return;
    }

    /* Exclude some tags:
     * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*_commentary&limit=1000
     * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*_sample&limit=1000
     * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=bad_*_id&limit=1000
     */
    const tags = sanitize_tag_string(data.post.dataset.tags).filter(tag => tag === "social_commentary" || !(tag === "commentary" || tag === "commentary_request" || tag.endsWith("_commentary") || tag.endsWith("_sample") || tag.match(/bad_[a-z]+_id/) || DO_NOT_COPY_LIST.includes(tag)));
    const was_translated = tags.includes("translated");
    if (was_translated) {
      /* Assume Danbooru only gives us correct tag strings */
      tags.splice(tags.indexOf("translated"), 1);
    }
    switch (data.mode) {
      case "parent":
        $("#post_parent_id").val(data.post.dataset.id);
        tags.push(`parent:${data.post.dataset.id}`);
        break;
      case "child":
        tags.push(`child:${data.post.dataset.id}`);
        break;
    }
    $("#post_tag_string").val(tags.join(" ")).trigger("input");

    // TODO: fix
    // tags_field.scrollTop(tags_field[0].scrollHeight);

    $(`#post_rating_${data.post.dataset.rating}`).click();
    $(".tab.source-tab")[0].click();
    if (was_translated) {
      Danbooru.Utility.notice([_tmpl$$2(), _tmpl$2$1(), _tmpl$3$1(), _tmpl$4$1(), _tmpl$5()], false);
    } else {
      Danbooru.Utility.notice([_tmpl$$2(), _tmpl$2$1(), _tmpl$5()], false);
    }
  }
  process_elements() {
    for (const post of document.querySelectorAll(".iqdb-posts article")) {
      const target = post.querySelector(":has(> div > .iqdb-similarity-score)");
      const _self$ = this;
      target.appendChild((() => {
        var _el$9 = _tmpl$6(),
          _el$10 = _el$9.firstChild,
          _el$11 = _el$10.nextSibling,
          _el$12 = _el$11.nextSibling,
          _el$13 = _el$12.nextSibling,
          _el$14 = _el$13.nextSibling,
          _el$15 = _el$14.nextSibling;
        _el$11.$$click = _self$.copy_tags.bind(_self$);
        _el$11.$$clickData = {
          post,
          mode: "parent"
        };
        _el$13.$$click = _self$.copy_tags.bind(_self$);
        _el$13.$$clickData = {
          post,
          mode: "another_child"
        };
        _el$15.$$click = _self$.copy_tags.bind(_self$);
        _el$15.$$clickData = {
          post,
          mode: "child"
        };
        return _el$9;
      })());
    }
  }
  enable() {
    logger$3.info("Enabling");
    const mutation_callback = (mutations, observer) => {
      for (const mutation of mutations) {
        switch (mutation.type) {
          case "childList":
            for (const node of mutation.addedNodes) {
              if (node.className === "iqdb-posts") {
                this.process_elements();
                observer.disconnect();
                return;
              }
            }
            break;
        }
      }
    };
    const observer = new MutationObserver(mutation_callback);
    observer.observe(document.getElementById("iqdb-similar"), {
      subtree: true,
      childList: true
    });
  }
  disable() {
    logger$3.info("Disabling");
  }
}
web.delegateEvents(["click"]);var css_248z$1 = ".media-asset-component{--maybe-max-height:calc(100vh - max(1rem, var(--header-visible-height)));--height:calc(max(var(--min-asset-height), var(--maybe-max-height)));max-height:var(--height)!important;min-height:var(--height)!important;overflow:hidden!important;position:sticky!important}.media-asset-component .media-asset-container{height:100%!important;width:100%!important}.media-asset-component .media-asset-zoom-level{cursor:pointer;pointer-events:all;z-index:1}.media-asset-component .media-asset-image{cursor:default;max-height:100%!important;max-width:100%!important}.media-asset-component .media-asset-panzoom{align-items:center;display:flex;flex:1;height:100%;justify-content:center;width:100%}.upload-image-container{overflow-x:hidden}";var _tmpl$$1 = /*#__PURE__*/web.template(`<div class=media-asset-panzoom>`);
/* Based on hdk5's panzoom */

const logger$2 = new Logger("Panzoom");
class PanzoomFeature extends Feature {
  constructor() {
    super("panzoom");
    this._panzoom = $(_tmpl$$1());
    Options.register_feature("panzoom", this);
  }
  _fit() {
    this._panzoom_instance.zoomAbs(0, 0, 1);
    this._panzoom_instance.moveTo(0, 0);
  }
  _update_zoom() {
    this._zoom_level.removeClass("hidden").text(`${Math.round(100 * this._zoom_level_value())}%`);

    // Rendering without smoothing makes checking for artifacts easier
    this._container.css("image-rendering", this._zoom_level_value() > 1 ? "pixelated" : "auto");
  }
  _zoom_level_value() {
    return this._image.width() * this._panzoom_instance.getTransform().scale / parseFloat(this._image.attr("width"));
  }
  enable() {
    logger$2.info("Enabling");
    GM_addStyle(css_248z$1);
    const initializer = () => {
      this._component = $(".media-asset-component");
      this._container = this._component.find(".media-asset-container");
      this._image = this._component.find(".media-asset-image");
      this._zoom_level = this._component.find(".media-asset-zoom-level");
      this._component.removeClass("media-asset-component-fit-height");
      this._panzoom.insertBefore(this._image);
      this._image.detach().appendTo(this._panzoom);
      this._image.off();
      this._panzoom_instance = panzoom(this._panzoom[0]);
      this._fit();
      this._zoom_level.on("click", _ => this._fit());
      this._update_zoom();
      this._panzoom_instance.on("zoom", _ => this._update_zoom());
      new ResizeObserver(_ => this._update_zoom()).observe(this._image[0]);
    };
    $(initializer);
  }
  disable() {
    logger$2.info("Disabling");
  }
}var css_248z = ".awoo-recently-added{background:var(--wiki-page-versions-diff-ins-background)}";var _tmpl$ = /*#__PURE__*/web.template(`<a>View`),
  _tmpl$2 = /*#__PURE__*/web.template(`<li id=post-info-views>`),
  _tmpl$3 = /*#__PURE__*/web.template(`<a id=view-wiki-link target=_blank>Create wiki`),
  _tmpl$4 = /*#__PURE__*/web.template(`<span> | `);
const logger$1 = new Logger("UITweaks");
class UITweaks extends Feature {
  constructor() {
    super("UITweaks");
    Options.register_feature("UITweaks", this);
  }
  _feedback_direct_link() {
    const make_link = id => (() => {
      var _el$ = _tmpl$();
      web.setAttribute(_el$, "href", `/user_feedbacks/${id}`);
      return _el$;
    })();
    const table = $("#user-feedbacks-table");
    table.find("th.control-column").text("Control");
    table.find("tbody > tr").each((_, el) => {
      const tr = $(el);
      const link = make_link(tr.data("id"));
      if (tr.data("creator-id") === Danbooru.CurrentUser.data("id")) {
        tr.find(".control-column").append(" | ").append(link);
      } else {
        tr.find(".control-column").append(link);
      }
    });
  }
  _profile_stats() {
    const rows = $(".user-statistics tr").map((_, e) => $(e));
    const get_row = header => {
      for (const row of rows) {
        if (row.find("th").text() === header) {
          return row.find("td");
        }
      }
      throw new Error(`Couldn't find row: ${header}`);
    };
    const get_count = hdr => $(document.body).data(`user-${hdr}-count`);
    get_row("Uploads").append(`(${(get_count("post-upload") / get_count("post-update") * 100 || 0).toFixed(2)}% of post changes)`);
    const deleted = get_row("Deleted Uploads");
    deleted.append(`(${(+deleted.find("a").text() / get_count("post-upload") * 100 || 0).toFixed(2)}% of uploads)`);
  }
  async _view_count() {
    const views = await $.get(`https://isshiki.donmai.us/post_views/${$(document.body).data("post-id")}`);
    $("#post-info-favorites").after((() => {
      var _el$2 = _tmpl$2();
      web.insert(_el$2, `Views: ${views}`);
      return _el$2;
    })());
  }
  async _recent_tags() {
    /* Based on Nameless Contributor's userscript */

    const versions = await $.getJSON("/post_versions.json", {
      "search": {
        "post_id": $(document.body).data("post-id")
      },
      "limit": 1,
      "only": "added_tags,rating_changed,source_changed,version"
    });
    if (versions.length !== 1 || versions[0].version === 1) {
      return;
    }
    const [version] = versions;
    for (const tag of $("#tag-list li")) {
      if (version.added_tags.includes(tag.dataset.tagName)) {
        tag.classList.add("awoo-recently-added");
      }
    }
    if (version.rating_changed) {
      $("#post-info-rating").addClass("awoo-recently-added");
    }
    if (version.source_changed) {
      $("#post-info-source").addClass("awoo-recently-added");
    }
  }
  _create_artist_wiki() {
    const container = $("#view-artist-link").parent();
    if (container.has("#view-wiki-link").length === 0) {
      const artist_name = new URLSearchParams($("#a-show > div.flex.items-center.gap-2 > a").attr("href").split("?")[1]).get("tags");
      container.prepend([(() => {
        var _el$3 = _tmpl$3();
        web.setAttribute(_el$3, "href", `/wiki_pages/new?wiki_page[title]=${artist_name}`);
        return _el$3;
      })(), _tmpl$4()]);
    }
  }
  enable() {
    logger$1.info("Enabling");
    GM_addStyle(css_248z);
    switch (PageManager.current_page()) {
      case Page.UserFeedbacks:
        this._feedback_direct_link();
        break;
      case Page.ViewUser:
        this._profile_stats();
        break;
      case Page.ViewPost:
        if (PageManager.is_danbooru()) {
          this._view_count();
        }
        this._recent_tags();
        break;
      case Page.ViewArtist:
        this._create_artist_wiki();
        break;
    }
  }
  disable() {
    logger$1.info("Disabling");
  }
}const feature_mapping = {
  [Page.UploadSingle]: [BetterTagBoxFeature, OneUpFeature, PanzoomFeature],
  [Page.UploadMultiple]: [],
  [Page.ViewPost]: [BetterTagBoxFeature, UITweaks],
  [Page.ViewMediaAsset]: [PanzoomFeature],
  [Page.UserFeedbacks]: [UITweaks],
  [Page.ViewUser]: [UITweaks],
  [Page.ViewArtist]: [UITweaks]
};
const logger = new Logger("Awoobooru3");
const features = feature_mapping[PageManager.current_page()];
if (features.length === 0) {
  logger.info(`No features for ${Page[PageManager.current_page()]}`);
} else {
  logger.info(`Initializing ${Page[PageManager.current_page()]} with ${features.length} feature${features.length === 1 ? "" : "s"}:`, features.map(f => f.name).join(", "));
}
const active_features = features.map(feature => new feature());
if (active_features.length > 0) {
  GM_addStyle(css_248z$2);
}})(VM.solid.web,VM.solid,VM.solid.store);