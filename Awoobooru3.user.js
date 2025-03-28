// ==UserScript==
// @name        Awoobooru 3
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*
// @match       *://*.donmai.us/posts*
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @version     3.0.0
// @author      TypeA2
// @description Various utilities to make life easier
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @run-at      document-end
// ==/UserScript==

"use strict";

const DEFAULT_REPLACEMENTS = [
    { type: "regex", search: "(?<=.+[_|-])shrit", replace: "shirt" },
    { type: "regex", search: "(?<!t)-(?=shirt)", replace: "_" },

    { type: "regex", search: "(?<=.+[_|-])skrit", replace: "skirt" },
    { type: "regex", search: "(?<!half)-(?=skirt)", replace: "_" },

    { type: "regex", search: "(?<=.+[_|-])naisl", replace: "nails" },
    { type: "regex", search: "(?<=.+)-(?=nails)", replace: "_" },

    { type: "regex", search: "(?<=.+)-(?=sweater)", replace: "_" },
    
    { type: "regex", search: "(?<=.+[_|-])shrots", replace: "shorts" },
    { type: "regex", search: "(?<=.+)-(?=shorts)", replace: "_" },
    
    { type: "regex", search: "(?<=.+)-(?=eyes)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=hair)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=dress)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=jacket)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=ribbon)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=hat)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=necktie)", replace: "_" },
    { type: "regex", search: "(?<=(.+){2,})-(?=bow)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=brooch)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=belt)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=cardigan)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=corset)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=coat)", replace: "_" },
    
    { type: "regex", search: "colalred(?=[_|-].+)", replace: "collared" },

    { type: "regex", search: "(?<=.+[_|-])haiar", replace: "hair" },
    { type: "regex", search: "(?<=.+[_|-])hairl", replace: "hair" },
    { type: "regex", search: "(?<=.+[_|-])eyesl", replace: "eyes" },
    { type: "regex", search: "(?<=.+[_|-])eys", replace: "eyes" },
    { type: "regex", search: "(?<=.+[_|-])flwoer", replace: "flower" },
    { type: "regex", search: "blakc(?=[_|-].+)", replace: "black" },

    { type: "simple", search: "outdoros", replace: "outdoors" },
    { type: "simple", search: "colalred_shirt", replace: "collared_shirt" },
    { type: "simple", search: "earrinsg", replace: "earrings" },
    { type: "simple", search: "sweatdorp", replace: "sweatdrop" },
    { type: "simple", search: "tongue-out", replace: "tongue_out" },
    { type: "simple", search: "character-name", replace: "character_name" },
    { type: "simple", search: "thigh-strap", replace: "thigh_strap" },
    { type: "simple", search: "anger-vein", replace: "anger_vein" },
    { type: "simple", search: "bleu_eyes", replace: "blue_eyes" },
    { type: "simple", search: "hicket", replace: "hickey" },
    { type: "simple", search: "colared_shirt", replace: "collared_shirt" },
    { type: "simple", search: "lbush", replace: "blush" },
    { type: "simple", search: "cat_eras", replace: "cat_ears" },
    { type: "simple", search: "ponytial", replace: "ponytail" },
    { type: "simple", search: "sidelocsk", replace: "sidelocks" },
    { type: "simple", search: "film-grain", replace: "film_grain" }
];

const OPTIONS_SCHEMA = {
    "oneup.enabled": {
        caption: "Easy 1up",
        defval: true,
        type: "enable",
    },
    "tag_checker.enabled": {
        caption: "Tag checker",
        defval: true,
        type: "enable",
    },
    "tag_checker.autocorrect.enabled": {
        caption: "Autocorrect",
        defval: true,
        type: "enable",
    },
    "tag_checker.autocorrect.dictionary": {
        caption: "Autocorrect dictionary",
        defval: DEFAULT_REPLACEMENTS,
        type: "table",
        columns: [
            {
                type: "select",
                options: [ "simple", "regex" ],
                key: "type",
            },
            {
                type: "regex",
                key: "search"
            },
            {
                type: "text",
                key: "replace"
            }
        ]
    }
}

function __log(func, args) {
    func.apply(null, [ `[Awoobooru]`, ...args ])
}

const log = {
    debug: function() { __log(console.debug, arguments) },
    info: function() { __log(console.info, arguments) },
    warn: function() { __log(console.warn, arguments) },
    error: function() { __log(console.error, arguments) }
};

Object.freeze(log);

class Options {
    static #options;

    static #callbacks = [];

    static get default_options() {
        let res = {};

        for (const [key, desc] of Object.entries(OPTIONS_SCHEMA)) {
            const path = key.split(".");
            const valkey = path.pop();

            let cur = res;

            for (const part of path) {
                if (!cur.hasOwnProperty(part)) {
                    cur[part] = {};
                }

                cur = cur[part];
            }

            cur[valkey] = desc.defval;
        }

        return res;
    }

    static watch(key, cb) {
        this.#callbacks.push({ key, cb });
    }

    static set(path, val, create_path = false) {
        const old = create_path ? null : this.#get_key(this.#options, path);

        if (old !== val) {
            log.info(`Updating ${path} from`, old, "to", val);
            this.#set_key(this.#options, path, val, create_path);
            localStorage.setItem("awoo-options", JSON.stringify(this.#options));

            for (const { key, cb } of this.#callbacks) {
                if (key === path) {
                    cb(old, val);
                }
            }
        }
    }

    static get(path) {
        return this.#get_key(this.#options, path);
    }

    static exists(path) {
        let target = this.#options;
        for (const key of path.split(".")) {
            if (!target.hasOwnProperty(key)) {
                return false;
            }

            target = target[key];
        }

        return true;
    }

    static #get_key(obj, path) {
        let target = obj;
        for (const key of path.split(".")) {
            if (!target.hasOwnProperty(key)) {
                throw new Error(`Key ${key} not found (path: ${path})`);
            }

            target = target[key];
        }

        return target;
    }

    static #set_key(obj, path, val, create = false) {
        let target = obj;
        const full_path = path.split(".");
        for (const key of full_path.slice(0, -1)) {
            if (!target.hasOwnProperty(key)) {
                if (!create) {
                    throw new Error(`Key ${el} not found (path: ${path})`);
                } else {
                    target[key] = {};
                }
            }

            target = target[key];
        }

        
        if (!create && !target.hasOwnProperty(full_path.slice(-1))) {
            throw new Error(`Key ${full_path.slice(-1)} not found (path: ${path})`);
        }

        target[full_path.slice(-1)] = val;
    }

    static #storage_change(old) {
        for (const { key, cb } of this.#callbacks) {
            let old_target;
            let new_target;
            try {
                old_target = this.#get_key(old, key);
            } catch (e) {
                log.error("Old value", e);
                continue;
            }

            try {
                new_target = this.#get_key(this.#options, key);
            } catch (e) {
                log.error("New value", e);
                continue;
            }

            if (old_target !== new_target) {
                cb(old_target, new_target);
            }
        }
    }

    static {
        const val = localStorage.getItem("awoo-options");
        if (val === null) {
            this.#options = this.default_options;
            localStorage.setItem("awoo-options", JSON.stringify(this.#options));
        } else {
            this.#options = JSON.parse(val);
        }

        for (const [key, desc] of Object.entries(OPTIONS_SCHEMA)) {
            if (!this.exists(key)) {
                log.info("Default initializing " + key + " to ", desc.defval);
                this.set(key, desc.defval, true);
            } else {
                log.info(key + " exists");
            }
        }

        window.addEventListener("storage", (e) => {
            if (e.key === "awoo-options") {
                const old = this.#options;
                
                this.#options = JSON.parse(e.newValue);

                log.info("Reloaded options:", this.#options);

                this.#storage_change(old);
            }
        });

        log.info("Loaded options:", this.#options);
    }

    static #dialog_inputs() {
        let res = [];

        res.push($("<div></div>", {
            "class": "input",
            html: $("<button></button>", {
                id: "awoo-option-load-default",
                text: "Load default",
                type: "Button",
                click: _ => {
                    if (confirm("Loading default settings, are you sure?")) {
                        this.#options = this.default_options;
                        localStorage.setItem("awoo-options", JSON.stringify(this.#options));

                        /* Re-open the dialog to update all values */
                        $("#awoo-options-dialog").on("dialogclose", _ => this.open_dialog());
                        $("#awoo-options-dialog").dialog("close");
                    }
                }
            })
        }))

        for (const [key, desc] of Object.entries(OPTIONS_SCHEMA)) {
            const row = $("<div></div>", {
                "class": "input"
            });
            row.append($("<label></label>", {
                "for": "awoo-option-" + key,
                text: desc.caption
            }));
            
            switch (desc.type) {
                case "enable":
                    const enable_opt = $("<option></option>", {
                        value: "enabled",
                        text: "Enabled"
                    });
                    const disable_opt = $("<option></option>", {
                        value: "disabled",
                        text: "Disabled"
                    });

                    if (this.get(key)) {
                        enable_opt.prop("selected", true);
                    } else {
                        disable_opt.prop("selected", true);
                    }

                    row.append($("<select></select>", {
                        "data-option-path": key,
                        id: "awoo-option-" + key,
                        class: "awoo-option-input",
                        data: {
                            converter: el => el.value === "enabled"
                        },
                        html: [ enable_opt, disable_opt ]
                    }));
                    break;

                case "table":
                    const edit_btn = $("<button></button>", {
                        type: "button",
                        "data-option-path": key,
                        id: "awoo-option-" + key,
                        class: "awoo-option-input",
                        text: "Edit",
                        click: e => this.#table_dialog(desc, $(e.target)),
                        data: {
                            value: this.get(key),
                            converter: el => $(el).data("value")
                        },
                    });

                    row.append(edit_btn);

                    row.append($("<button></button>", {
                        type: "button",
                        id: "awoo-option-export-" + key,
                        text: "Export",
                        click: _ => prompt(desc.caption, JSON.stringify(edit_btn.data("value")))
                    }));

                    row.append($("<button></button>", {
                        type: "button",
                        id: "awoo-option-import-" + key,
                        text: "Import",
                        click: _ => {
                            const val = prompt(desc.caption);

                            if (val) {
                                try {
                                    edit_btn.data("value", JSON.parse(val));
                                } catch (_) {
                                    alert("Invalid JSON");
                                }
                            }
                        }
                    }));
                    break;
            }

            res.push(row);
        }

        return res;
    }

    static #table_row(desc, val, i) {
        const row = $("<tr></tr>", {
            "data-row-idx": i
        });

        const columns = [];

        for (const col of desc.columns) {
            let el;
            switch (col.type) {
                case "select":
                    el = $("<select></select>", {
                        "data-col-key": col.key,
                        class: "awoo-option-input"
                    });

                    el.append(col.options.map(v => $("<option></option>", {
                        value: v,
                        text: v,
                        selected: val[col.key] == v
                    })));

                    break;

                case "regex":
                    el = $("<input>", {
                        type: "text",
                        "data-col-key": col.key,
                        class: "awoo-option-input",
                        value: val[col.key]
                    });

                    el.on("input", e => {
                        try {
                            const _ = new RegExp(e.target.value, "i");
                            $(e.target).removeClass("awoo-invalid-input");
                        } catch (_) {
                            $(e.target).addClass("awoo-invalid-input");
                        }

                        $("#awoo-table-dialog-submit").prop("disabled", $("#awoo-options-table-dialog .awoo-invalid-input").length > 0);
                    });
                    break;

                case "text":
                    el = $("<input>", {
                        type: "text",
                        "data-col-key": col.key,
                        class: "awoo-option-input",
                        value: val[col.key]
                    });
                    break;
            }

            columns.push($("<td></td>", {
                html: el
            }));
        }
        
        row.append($("<th></th>", {
            text: `[${i}]`
        }));

        row.append(columns);

        return row;
    }

    static #table_dialog(desc, el) {
        const rows = $(el).data("value").map((val, i) => this.#table_row(desc, val, i));

        const dialog_body = $("<div></div>", {
            id: "awoo-options-table-dialog",
            html: [
                $("<table></table>", {
                    class: "simple_form",
                    id: "awoo-options-table-form",
                    html: rows,
                })
            ]
        });

        const dialog = dialog_body.dialog({
            title: desc.caption,
            width: 1280,
            modal: true,
            buttons: [
                {
                    text: "Add row",
                    click: () => {
                        const default_object = {};
                        for (const col of desc.columns) {
                            default_object[col.key] = "";
                        }

                        $("#awoo-options-table-form").append(this.#table_row(desc, default_object, +$("#awoo-options-table-form tr:last-child").attr("data-row-idx") + 1));
                    }
                },
                {
                    text: "Submit",
                    id: "awoo-table-dialog-submit",
                    click: () => {
                        const res = [];
                        log.info($("#awoo-options-table-form tr"));
                        for (const row of $("#awoo-options-table-form tr")) {
                            const val = {};
                            for (const input of $(row).find(".awoo-option-input")) {
                                val[input.dataset.colKey] = input.value;
                            }
                            res.push(val);
                        }
                        $(el).data("value", res);
                        dialog.dialog("close");
                        dialog.remove();
                    },
                },
                {
                    text: "Cancel",
                    click: () => {
                        dialog.dialog("close");
                        dialog.remove();
                    }
                }
            ]
        });

        dialog.dialog();
    }

    static open_dialog() {
        const dialog_body = $("<div></div>", {
            id: "awoo-options-dialog",
            html: [
                $("<form></form>", {
                    class: "simple_form",
                    id: "awoo-options-form",
                    html: this.#dialog_inputs(),
                })
            ]
        });

        const dialog = dialog_body.dialog({
            title: "Awoobooru 3 settings",
            width: 960,
            modal: true,
            buttons: {
                Submit: () => {
                    for (const el of dialog.find(".awoo-option-input")) {
                        Options.set(el.dataset.optionPath, $(el).data("converter")(el));
                    }
                    dialog.dialog("close");
                },
                Cancel: () => dialog.dialog("close")
            }
        });
    }
}

function* array_chunks(arr, n) {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}

function search_items(endpoint, search_data, attributes) {
    return new Promise(async (resolve, reject) => {
        const PAGE_SIZE = 1000;
        const MAX_GET_LENGTH = 96;
        let last_id = 0;
        let result = [];

        if (!attributes.includes("id")) {
            attributes.push("id");
        }

        const base_request_data = {
            limit: PAGE_SIZE,
            search: search_data,
            only: attributes.join(","),
        };

        for (;;) {
            let data = base_request_data;
            data["page"] = `a${last_id}`;

            let method = "GET";

            if ($.param(data).length > MAX_GET_LENGTH) {
                method = "POST";
                data["_method"] = "get";
            }
            log.info(method, endpoint, data);

            let res = await $.ajax(`/${endpoint}.json`, {
                method,
                dataType: "json",
                data
            });

            for (const item of res) {
                if (item.id > last_id) {
                    last_id = item.id;
                }
            }

            result = result.concat(res);

            if (res.length < PAGE_SIZE) {
                return resolve(result);
            }
        }
    });
}

GM_registerMenuCommand("Settings", _ => Options.open_dialog(), { title: "Open settings menu" });

const style = `
#awoo-options-form :focus {
    outline: none;
}

#awoo-options-form button {
    margin-right: 0.2em;
}

#awoo-check-tags {
    margin: 0 1em;
    border: none;
    cursor: initial;
}

input.awoo-working {
    cursor: wait;
}

#awoo-tag-checker-notice {
    padding: 0.25em;
}

#awoo-tag-checker-notice th, #awoo-tag-checker-notice td {
    padding: 0.1em;
}

#awoo-tag-checker-notice label {
    text-align: left;
    margin-right: 0.25em;
}
#awoo-tag-checker-notice a.awoo-remove-tag {
    padding: 0 0.1em;
    font-weight: bold;
    font-size: 1.2em;
}

#post_tag_string.awoo-disabled {
    color: var(--form-input-border-color);
    cursor: text;
}

#awoo-options-table-dialog th, #awoo-options-table-dialog td {
    padding: 0.1em;
}

.awoo-invalid-input, .awoo-invalid-input:active {
    background-color: var(--notice-error-background);
}
`;

GM_addStyle(style);

class OneUpFeature {
    constructor() {
        if ($("#iqdb-similar").length === 0) {
            /* Not on an upload page */
            return;
        }

        this.posts = [];

        if (!Options.get("oneup.enabled")) {
            return;
        }

        const mutation_callback = (mutations) => {
            for (const mutation of mutations) {
                switch (mutation.type) {
                    case "childList":
                        for (const node of mutation.addedNodes) {
                            if (node.className === "iqdb-posts") {
                                this.enable();
                                this.observer.disconnect();
                                return;
                            }
                        }
                        break;
                }
            }
        };
        
        this.observer = new MutationObserver(mutation_callback);
        this.observer.observe(document.getElementById("iqdb-similar"), { subtree: true, childList: true });

        Options.watch("oneup.enabled", (_, is_enabled) => {
            if (is_enabled) {
                this.enable();
            } else {
                this.disable();
            }
        });
    }

    enable() {
        for (const post of $(".iqdb-posts article")) {
            const links = $(post).find(":has(>.iqdb-similarity-score)");
    
            links.append($("<span></span>", { "class": "awoo-sep", text: " | "}));
            links.append($("<a></a>", {
                "class": "awoo-link",
                text: "parent",
                href: "#",
                click: () => this.copy_tags(post, true)
            }));
            links.append($("<span></span>", { "class": "awoo-sep", text: " | "}));
            links.append($("<a></a>", {
                "class": "awoo-link",
                text: "child",
                href: "#",
                click: () => this.copy_tags(post, false)
            }));

            this.posts.push(post);
        }
    }

    disable() {
        for (const post of this.posts) {
            $(post).find(".awoo-sep, .awoo-link").remove();
        }

        this.posts = [];
    }

    copy_tags(post, is_parent) {
        /* Copy tags and rating, omit commentary tags */

        /* All except commentary tags, but there's one gentag:
        * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*commentary*&limit=1000
        */
        const tags = post.dataset.tags.split(" ").filter(t => t === "social_commentary" || t.indexOf("commentary") == -1);

        $(`input.radio_buttons[value='${post.dataset.rating}']`)[0].checked = true;

        if (is_parent) {
            $("#post_parent_id").val(post.dataset.id);
        } else {
            tags.push("child:" + post.dataset.id);
        }

        const tags_field = $("#post_tag_string");
        tags_field.val(tags.join(" ") + " ");
        tags_field.trigger("input");

        // TODO: fix
        // tags_field.scrollTop(tags_field[0].scrollHeight);

        $(".tab.source-tab")[0].click();

        Danbooru.Utility.notice("Succesfully copied tags. Please check the commentary tags.", false);
    }
}

/* https://github.com/danbooru/danbooru/blob/a9593dda98db89576278defc06eb20650faa784d/app/logical/tag_category.rb#L16 */
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

const CATEGORY_TO_NAME = {
    "0": "general",
    "1": "artist",
    "3": "copyright",
    "4": "character",
    "5": "meta"
};

const SPECIAL_TAGS = [
    "rating:", "parent:", "child:", "source:",
    "pool:", "newpool:",
    "locked:",
    "fav:", "favgroup:", "upvote:", "downvote:",
    ...Object.keys(PREFIX_TO_CATEGORY).map(e => `${e}:`)
];

const TAG_FORMAT_ORDER = [ "artist", "copyright", "character", "general", "meta", "special", "removed", "deprecated", "not_found" ];

class TagCheckerFeature {
    constructor() {
        this.form = $(".upload-form, #edit .edit_post");
        this.post_btn = this.form.find("input[type='submit']");
        this.check_btn = $("<input>", {
            type: "button",
            "class": "button-secondary button-sm",
            id: "awoo-check-tags",
            value: "Check",
            click: async e => {
                e.preventDefault();
                if (await this.validate_tags()) {
                    Danbooru.Utility.notice("No issues found");
                }
            }
        });

        this.tags_field = $("#upload_tag_string, #post_tag_string");

        this.form_submit_handler = async e => {
            e.preventDefault();
            if (await this.validate_tags()) {

                /* The event handler isn't removed yet when this code runs, so manually disable it */
                this.form.off("submit", this.form_submit_handler);
                this.form.submit();
            } else {
                this.form.one("submit", this.form_submit_handler);
            }
        };

        Options.watch("tag_checker.enabled", (_, is_enabled) => {
            if (is_enabled) {
                this.enable();
            } else {
                this.disable();
            }
        });

        if (Options.get("tag_checker.enabled")) {
            this.enable();
        }
    }

    enable() {
        this.old_disable_with = this.post_btn.attr("data-disable-with");
        this.post_btn.removeAttr("data-disable-with");
        this.post_btn.after(this.check_btn);
        this.form.one("submit", this.form_submit_handler);
    }

    disable() {
        this.post_btn.attr("data-disable-with", this.old_disable_with);
        this.check_btn.remove();
        this.form.off("submit", this.form_submit_handler);
        this.tags_field.removeClass("awoo-disabled");
        $("#awoo-tag-checker-notice").remove();
    }

    async validate_tags() {
        this.post_btn.prop("disabled", true);
        this.post_btn.addClass("awoo-working");

        this.check_btn.prop("disabled", true);
        this.check_btn.addClass("awoo-working");

        $("#awoo-tag-checker-notice").remove();

        const success = await this.#validate_tags();

        this.post_btn.removeClass("awoo-working");
        this.post_btn.prop("disabled", false);
        
        this.check_btn.removeClass("awoo-working");
        this.check_btn.prop("disabled", false);

        return success;
    }

    async #get_tags() {
        let raw_tags = (this.tags_field.val() || "")
            .split(/([\s\n])/)
            .map(tag => tag.toLowerCase())
            .filter(s => /\S/.test(s))
            .sort();

        return Array.from(
            await Promise.all(
                new Set(raw_tags).map(async v => {
                    if (v[0] === "/") {
                        /* Resolve abbreviation */
                        const res = await fetch(`/autocomplete.json?search[query]=${v}&search[type]=tag&limit=1&only=value`).then(r => r.json());
                        return res[0].value;
                    } else {
                        return v;
                    }
                })
            )
        );
    }

    static #correct_tag(tag) {
        for (const { type, search, replace } of Options.get("tag_checker.autocorrect.dictionary")) {
            switch (type) {
                case "simple":
                    if (tag === search) {
                        return { corrected: true, tag: replace };
                    }
                    break;
                case "regex":
                    const regex = new RegExp(search, "i");
                    if (regex.test(tag)) {
                        return { corrected: true, tag: tag.replace(regex, replace) };
                    }
                    break;
            }
        }

        return { corrected: false, tag: tag };
    }

    static #correct_tags(tags) {
        let res = tags;

        let corrections = 0;
        do {
            let tmp_res = [];
            corrections = 0;
            for (const old_tag of res) {
                const { corrected, tag } = this.#correct_tag(old_tag);

                if (corrected) {
                    corrections += 1;
                }

                tmp_res.push(tag);
            }

            res = tmp_res;
        } while (corrections > 0);

        return res;
    }

    static #categorize_tags(tags) {
        let special_tags = new Set();
        let normal_tags = new Set();
        let removed_tags = new Set();

        for (let tag of tags) {
            const is_negated = (tag[0] === "-");

            if (tag.includes(":")) {
                if (SPECIAL_TAGS.find(prefix => (is_negated ? tag.slice(1) : tag).startsWith(prefix) && tag.length > prefix.length)) {
                    special_tags.add(tag);
                    continue;
                }

                /* Fallthrough */
            }

            if (is_negated) {
                removed_tags.add(tag.substring(1));
            } else {
                normal_tags.add(tag);
            }
        }

        /* Remove removed tags from both sets */
        const present_removed_tags = normal_tags.intersection(removed_tags);

        return {
            normal: [ ...normal_tags.difference(present_removed_tags) ],
            special: [ ...special_tags ],
            removed: [ ...removed_tags.difference(present_removed_tags) ]
        }
    }

    async #retrieve_tags(tags) {
        let found_tags = {};
        for (const chunk of array_chunks(tags, 1000)) {
            const items = await search_items("tags", { name: chunk, hide_empty: true }, [ "id", "name", "is_deprecated", "category" ]);
            
            items.forEach(e => found_tags[e.name] = { id: e.id, is_deprecated: e.is_deprecated, category: e.category });
        }

        return found_tags;
    }

    #update_tag_string() {
        let new_tag_string = "";

        for (const el of $(".awoo-tag-checker-fixer")) {
            /* Read current values from form */
            this.tag_map[el.dataset.rowKey][el.dataset.rowIdx] = el.value;
        }

        for (const category of TAG_FORMAT_ORDER) {
            /* Ignore empty categories */
            if (this.tag_map[category].length > 0) {
                /* Ignore empty tags */
                new_tag_string += this.tag_map[category].filter(s => /\S/.test(s)).join(" ") + "\n";
            }
        }

        this.tags_field.val(new_tag_string);
    }

    get #forgot_rating() {
        return ($("input[name='post[rating]']:checked").length === 0);
    }

    get #can_submit() {
        /* Check if rating is selected and whether any deprecated or unknown tags remain */
        if (!this.#forgot_rating && this.tag_map.deprecated.length === 0 && this.tag_map.not_found.length === 0) {
            return true;
        }

        return false;
    }

    #make_fixer_row(caption, tag, row_idx, row_key, arr) {
        const row = $("<tr></tr>", {
            "data-row-idx": row_idx,
            "data-row-key": row_key,
        });

        const row_contents = [
            $("<th></th>", {
                html: $("<label></label>", {
                    text: caption + ":",
                    "for": `awoo-tag-checker-${row_idx}`
                })
            }),
            $("<td></td>", {
                html: $("<input>", {
                    type: "text",
                    class: "awoo-tag-checker-fixer",
                    value: tag,
                    id: `awoo-tag-checker-${row_idx}`,
                    "data-autocomplete": "tag",
                    "data-original-tag": tag,
                    "data-row-key": row_key,
                    "data-row-idx": row_idx,
                    tabindex: row_idx + 1
                })
            }),
            $("<td></td>", {
                html: $("<a></a>", {
                    html: "&times;",
                    "class": "awoo-remove-tag",
                    href: "#",
                    title: `Remove "${tag}"`,
                    click: _ => {
                        /* Making a tag empty ignores it in formatting, effectively removing it without having to recalculate indices */
                        //this.tag_map[row.attr("data-row-key")][row.attr("data-row-idx")] = "";
                        arr[row_idx] = "";
                        row.remove();
                        
                        this.#update_tag_string();
                        this.#reformat_notice();
                    }
                })
            })
        ]

        row.append(row_contents);

        return row;
    }

    #create_fixer_notice() {
        const notice_fields = [];

        if (this.#forgot_rating) {
            const ratings = $(".post_rating");
            ratings.addClass("field_with_errors");
            ratings.one("input", _ => {
                ratings.removeClass("field_with_errors");
                $("#awoo-rating-notice").remove();

                this.#reformat_notice();
            });

            notice_fields.push(
                $("<tr></tr>", {
                    id: "awoo-rating-notice",
                    "data-row-key": "rating",
                    html: $("<th></th>", {
                        colspan: 3,
                        text: "Rating not selected!"
                    })
                })
            );
        }

        const deprecated_fields = this.tag_map.deprecated.map((tag, idx, arr) => this.#make_fixer_row("Deprecated", tag, idx, "deprecated", arr));
        const not_found_fields = this.tag_map.not_found.map((tag, idx, arr) => this.#make_fixer_row("New tag", tag, idx, "not_found", arr));

        notice_fields.push(...deprecated_fields);
        notice_fields.push(...not_found_fields);

        const inputs = $(notice_fields.map(e => e[0])).find("input[data-autocomplete='tag']");
        inputs.autocomplete({
            source: async (request, respond) => respond(await Danbooru.Autocomplete.autocomplete_source(request.term, "tag")),
            close: (e) => {
                /* Prevent inserting multiple tags */
                e.target.value = e.target.value.split(" ")[0];
                this.#update_tag_string();
            }
        });
        inputs.on("focus", e => $(e.target).data("uiAutocomplete").search(e.target.value));
        inputs.on("input", _ => this.#update_tag_string());
        // inputs.on("keydown", console.log);
        // inputs.on("blur", console.log);

        const notice = $("<div></div>", {
            id: "awoo-tag-checker-notice",
            "class": "notice-error",
            html: $("<table></table>", { html: notice_fields })
        });

        return notice;
    }

    #reformat_notice() {
        /* Remove duplicate separators */
        $("#awoo-tag-checker-notice hr + hr").remove();

        /* If nothing remains, remove the notice entirely */
        if ($(".awoo-tag-checker-fixer").length === 0) {
            this.tags_field.removeClass("awoo-disabled");
            $("#awoo-tag-checker-notice").remove();
        }
    }

    async #validate_tags() {
        this.tags_field.removeClass("awoo-disabled");

        this.tag_map = {
            general: [],
            artist: [],
            copyright: [],
            character: [],
            meta: [],
            special: [],
            removed: [],
            deprecated: [],
            not_found: [],
        }

        let tags = await this.#get_tags();

        let { normal: normal_tags, special: special_tags, removed: removed_tags } = TagCheckerFeature.#categorize_tags(tags);

        if (Options.get("tag_checker.autocorrect.enabled")) {
            normal_tags = TagCheckerFeature.#correct_tags(normal_tags);
        }
        
        /* Store them with the leading "-" */
        this.tag_map.removed = removed_tags.map(tag => "-" + tag);

        const found_tags = await this.#retrieve_tags(normal_tags);

        /* Categorize regular tags */
        for (const tag of normal_tags) {
            if (!found_tags.hasOwnProperty(tag)) {
                this.tag_map.not_found.push(tag);
            } else {
                if (found_tags[tag].is_deprecated) {
                    this.tag_map.deprecated.push(tag);
                } else {
                    this.tag_map[CATEGORY_TO_NAME[found_tags[tag].category]].push(tag);
                }
            }
        }

        /* Categorize prefixed tags */
        for (const tag of special_tags) {
            const prefix = tag.split(":")[0];
            if (PREFIX_TO_CATEGORY.hasOwnProperty(prefix)) {
                /* Create a new tag with a specific type */
                this.tag_map[PREFIX_TO_CATEGORY[prefix]].push(tag)
            } else {
                /* Other meta tag */

                /* Handle a few special tags */
                if (tag.startsWith("rating:")) {
                    const rating = tag.substring(7, 8).toLowerCase();
                    if ("gsqe".includes(rating)) {
                        $(`#post_rating_${rating}`).prop("checked", true);
                        /* Keep rating: metatag in tag string */
                    }
                    /* Fallthrough */
                } else if (tag.startsWith("source:")) {
                    $("#post_source").val(tag.substring(7));
                    continue;
                } else if (tag.startsWith("parent:")) {
                    $("#post_parent_id").val(tag.substring(7));
                    /* Keep parent: metatag in tag string */
                }

                this.tag_map.special.push(tag);
            }
        }

        this.#update_tag_string();

        if (this.#can_submit) {
            return true;
        }

        /* Reset all checker fields once the tags field is edited */
        this.tags_field.one("input", _ => {
            $("#awoo-tag-checker-notice").remove();
            this.tags_field.removeClass("awoo-disabled");
        });
        this.tags_field.addClass("awoo-disabled");
        

        const notice = this.#create_fixer_notice();

        this.tags_field.after(notice);

        log.info("Special tags", special_tags);
        log.info("Normal tags", normal_tags);
        log.info("Found tags", found_tags);
        log.info("Tag categories", this.tag_map);

        return false;
    }
}

unsafeWindow.awoo_set_option = function(key, val) {
    Options.set(key, val);
}

unsafeWindow.awoo_get_option = function(key) {
    return Options.get(key);
}

if (location.pathname.startsWith("/uploads/")
    || location.pathname.startsWith("/posts")
    || (location.pathname === "/posts" && $(".upload-image-container").length > 0)) {
    var OneUp = new OneUpFeature();
    var TagChecker = new TagCheckerFeature();
}
