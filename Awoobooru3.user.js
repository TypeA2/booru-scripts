// ==UserScript==
// @name        Awoobooru 3
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*
// @match       *://*.donmai.us/posts*
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @version     3.0.0b
// @author      TypeA2
// @description Various utilities to make life easier
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @run-at      document-end
// ==/UserScript==

"use strict";

const DEFAULT_OPTIONS = {
    tag_checker: {
        enabled: true,
        autocorrect: {
            enabled: true,
            dictionary: [],
        }
    },
    oneup: {
        enabled: true,
    }
};

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

    static watch(key, cb) {
        this.#callbacks.push({ key, cb });
    }

    static set(path, val) {
        const old = this.#get_key(this.#options, path);

        if (old !== val) {
            log.info(`Updating ${path} from`, old, "to", val);
            this.#set_key(this.#options, path, val);
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

    static #get_key(obj, path) {
        let target = obj;
        for (const key of path.split(".")) {
            if (!target.hasOwnProperty(key)) {
                throw new Error(`Key ${el} not found (path: ${path})`);
            }

            target = target[key];
        }

        return target;
    }

    static #set_key(obj, path, val) {
        let target = obj;
        const full_path = path.split(".");
        for (const key of full_path.slice(0, -1)) {
            if (!target.hasOwnProperty(key)) {
                throw new Error(`Key ${el} not found (path: ${path})`);
            }

            target = target[key];
        }

        
        if (!target.hasOwnProperty(full_path.slice(-1))) {
            throw new Error(`Key ${el} not found (path: ${path})`);
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
            this.#options = DEFAULT_OPTIONS;
            localStorage.setItem("awoo-options", JSON.stringify(this.#options));
        } else {
            this.#options = JSON.parse(val);
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
}

/*


function form_table_element(kind, title, name, input_options) {
    let input_type;
    switch (kind) {
        case "select":
            input_type = "<select></select>";
            break;

        default:
            input_type = `<input type="${kind}">`
    }

    return $("<tr></tr>", {
        html: [
            `<th><label for="${name}">${title}</label></th>`,
            $("<td></td>", {
                html: $(input_type,  {
                    id: name,
                    ...input_options
                })
            })
        ]
    });
}

function form_yes_no(key, title) {
    return form_table_element("select", title, key, {
        html: [
            `<option value="true">Yes</option>`,
            `<option value="false">No</option>`
        ]
    })
}

function open_settings() {
    const dialog_body = $("<div></div>", {
        html: [
            $("<form></form>", {
                class: "simple-form",
                html: [
                    "<h4>Tag checker</h4>",
                    $("<table></table>", {
                        class: "table-sm",
                        html: [
                            form_yes_no("tag-checker-enabled", "Enabled"),
                            "<tr><th>Autocorrect</th><td></td></tr>",
                            form_yes_no("tag-checker-autocorrect-enabled", "Enabled")
                        ]
                    }),
                    "<h4>Easy 1up</h4>",
                    $("<table></table>", {
                        class: "table-sm",
                        html: [
                            form_yes_no("1up-enabled", "Enabled")
                        ]
                    })
                ]
            })
        ]
    });

    const dialog = dialog_body.dialog({
        title: "Awoobooru 3 settings",
        width: 700,
        modal: true,
        open: (e) => {
            const t = $(e.target);
            
            t.find("#tag-checker-enabled").val(options.tag_checker.enabled.toString());
            t.find("#1up-enabled").val(options.oneup.enabled.toString());
        },
        buttons: {
            Submit: () => {
                options.tag_checker.enabled = (dialog.find("#tag-checker-enabled").val() === "true");
                GM_setValue("tag-checker-enabled", options.tag_checker.enabled);
                (options.tag_checker.enabled ? TagChecker.enable : TagChecker.disable).apply(TagChecker);

                options.tag_checker.autocorrect.enabled = (dialog.find("#tag-checker-autocorrect-enabled").val() === "true");
                GM_setValue("tag-checker-autocorrect-enabled", options.tag_checker.autocorrect.enabled);
                // Do nothing: tag checker reads the options object directly 

                options.oneup.enabled = (dialog.find("#1up-enabled").val() === "true");
                GM_setValue("1up-enabled", options.oneup.enabled);
                (options.oneup.enabled ? OneUp.enable : OneUp.disable).apply(OneUp);

                log.info("Stored options:", options)

                dialog.dialog("close");
            },
            Cancel: () => dialog.dialog("close")
        }
    });
}
*/
function* array_chunks(arr, n) {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}

function search_items(endpoint, search_data, attributes) {
    return new Promise(async (resolve, reject) => {
        const PAGE_SIZE = 1000;
        let last_id = 0;
        let result = [];

        if (!attributes.includes("id")) {
            attributes.push("id");
        }

        const request_data = {
            _method: "GET",
            limit: PAGE_SIZE,
            search: search_data,
            only: attributes.join(","),
        };

        for (;;) {
            request_data["page"] = `a${last_id}`
            log.info("POST", endpoint, request_data);

            let res = await fetch(`/${endpoint}.json`, {
                method: "POST",
                body: JSON.stringify(request_data),
                headers: {
                    "X-HTTP-Method-Override": "get",
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                return reject(`Error: ${response.status}`);
            }

            let new_items = await res.json();

            for (const item of new_items) {
                if (item.id > last_id) {
                    last_id = item.id;
                }
            }

            result = result.concat(new_items);

            if (new_items.length < PAGE_SIZE) {
                return resolve(result);
            }
        }
    });
}

// GM_registerMenuCommand("Open settings", open_settings, { title: "Open settings menu" });

const style = `
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
}

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
        this.post_btn = $(".upload-form input[type='submit'], .edit_post input[type='submit']");
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

        this.form = $(".upload-form, .edit_post");
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

    static #categorize_tags(tags) {
        let special_tags = new Set();
        let normal_tags = new Set();
        let removed_tags = new Set();

        for (let tag of tags) {
            const is_negated = (tag[0] === "-");

            if (tag.includes(":")) {
                if (SPECIAL_TAGS.find(prefix => tag.startsWith(prefix) && tag.length > prefix.length)) {
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
        log.info(inputs);
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

        const tags = await this.#get_tags();
        let { normal: normal_tags, special: special_tags, removed: removed_tags } = TagCheckerFeature.#categorize_tags(tags);
        
        /* Store them with the leading "-" */
        this.tag_map.not_found = removed_tags.map(tag => "-" + tag);

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
                        continue;
                    }
                    /* Fallthrough */
                } else if (tag.startsWith("source:")) {
                    $("#post_source").val(tag.substring(7));
                    continue;
                } else if (tag.startsWith("parent:")) {
                    $("#post_parent_id").val(tag.substring(7));
                    continue;
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
