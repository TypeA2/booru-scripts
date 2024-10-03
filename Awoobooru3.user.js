// ==UserScript==
// @name        Awoobooru 3
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*
// @match       *://*.donmai.us/posts*
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @version     3.0.0a
// @author      TypeA2
// @description Various utilities to make life easier
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/Awoobooru3.user.js
// @run-at      document-end
// ==/UserScript==

"use strict";

/* These also act as default options */
const options = {
    tag_checker: {
        enabled: true,
        autocorrect: {
            enabled: true,
        }
    },
    oneup: {
        enabled: true
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

function load_settings() {
    const get_or_default = (key, def) => {
        let val = GM_getValue(key);
        if (val === undefined) {
            GM_setValue(key, def);
            return def;
        }
        return val;
    }
    
    options.tag_checker.enabled = get_or_default("tag-checker-enabled", options.tag_checker.enabled);
    options.oneup.enabled = get_or_default("1up-enabled", options.oneup.enabled);

    log.info("Loaded options:", options);
}

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
                /* Do nothing: tag checker reads the options object directly */

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

load_settings();

GM_registerMenuCommand("Open settings", open_settings, { title: "Open settings menu" });

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

        if (!options.oneup.enabled) {
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
    gen: 0,
    general: 0,
    art: 1,
    artist: 1,
    co: 3,
    copy: 3,
    copyright: 3,
    ch: 4,
    char: 4,
    character: 4,
    meta: 5
};

const SPECIAL_TAGS = [
    "rating:", "parent:", "child:", "source:",
    "pool:", "newpool:",
    "locked:",
    "fav:", "favgroup:", "upvote:", "downvote:",
    ...Object.keys(PREFIX_TO_CATEGORY).map(e => `${e}:`)
];

const TAG_FORMAT_ORDER = [ "1", "3", "4", "0", "5", "-1", "-2" ];

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
                this.form.submit();
            } else {
                this.form.one("submit", this.form_submit_handler);
            }
        };

        if (options.tag_checker.enabled) {
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

    async #validate_tags() {
        this.tags_field.removeClass("awoo-disabled");

        let tags = (this.tags_field.val() || "").split(/([\s\n])/).map(tag => tag.toLowerCase())
            .filter(s => /\S/.test(s))
            .sort();

        tags = Array.from(
            await Promise.all(
                new Set(tags).map(async v => {
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

        let special_tags = new Set();
        let normal_tags = [];

        for (const tag of tags) {
            if (tag.includes(":")) {
                if (SPECIAL_TAGS.find(prefix => tag.startsWith(prefix) && tag.length > prefix.length)) {
                    special_tags.add(tag);
                    continue;
                }

                /* Fallthrough */
            }

            normal_tags.push(tag);
        }

        let found_tags = {};
        for (const chunk of array_chunks(normal_tags, 1000)) {
            const items = await search_items("tags", { name: chunk, hide_empty: true }, [ "id", "name", "is_deprecated", "category" ]);
            
            items.forEach(e => found_tags[e.name] = { id: e.id, is_deprecated: e.is_deprecated, category: e.category });
        }

        const all_tags = {
            "0": [], /* general */
            "1": [], /* artist */
            "3": [], /* copyright */
            "4": [], /* character */
            "5": [], /* meta */
            "-1": [], /* special */
            "-2": [], /* not found */
        };

        for (const tag of normal_tags) {
            if (!found_tags.hasOwnProperty(tag)) {
                all_tags[-2].push(tag)
            } else {
                all_tags[found_tags[tag].category].push(tag)
            }
        }

        for (const tag of special_tags) {
            const operator = tag.split(":")[0];
            if (PREFIX_TO_CATEGORY.hasOwnProperty(operator)) {
                /* Create a new tag with a specific type */
                all_tags[PREFIX_TO_CATEGORY[operator]].push(tag);
            } else {
                /* Other meta tag */

                /* Handle a few special tags */
                if (tag.startsWith("rating:")) {
                    const rating = tag.substring(7, 1).toLowerCase();
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

                all_tags["-1"].push(tag);
            }
        }

        let new_tag_string = "";
        for (const category of TAG_FORMAT_ORDER.slice(0, -1)) {
            if (all_tags[category].length > 0) {
                new_tag_string += all_tags[category].join(" ") + "\n";
            }
        }

        const update_text = () => {
            for (const el of $(".awoo-tag-checker-fixer")) {
                all_tags[-2][el.dataset.index] = el.value;
            }

            this.tags_field.val(new_tag_string + all_tags[-2].filter(s => /\S/.test(s)).join(" "));
        };

        update_text();

        const forgot_rating = ($("input[name='post[rating]']:checked").length === 0);
        if (!forgot_rating && all_tags[-2].length === 0) {
            return true;
        }

        this.tags_field.one("focus", _ => {
            $("#awoo-tag-checker-notice").remove();
            this.tags_field.removeClass("awoo-disabled");
        });
        this.tags_field.addClass("awoo-disabled");
        let input_row = 0;
        const notice = $("<div></div>", {
            id: "awoo-tag-checker-notice",
            "class": "notice-error",
            html: $("<table></table>", {
                html:  all_tags[-2].map(tag =>
                    $("<tr></tr>", {
                        "data-row-num": input_row ,
                        html: [
                            $("<th></th>", {
                                html: $("<label></label>", {
                                    text: tag,
                                    "for": `awoo-tag-checker-${++input_row}`
                                })
                            }),
                            $("<td></td>", {
                                html: $("<input>", {
                                    type: "text",
                                    class: "awoo-tag-checker-fixer",
                                    value: tag,
                                    id: `awoo-tag-checker-${input_row}`,
                                    "data-autocomplete": "tag",
                                    "data-original-tag": tag,
                                    "data-index": input_row - 1,
                                })
                            }),
                            $("<td></td>", {
                                html: $("<a></a>", {
                                    html: "&times;",
                                    "class": "awoo-remove-tag",
                                    href: "#",
                                    title: `Remove "${tag}"`,
                                    click: e => {
                                        const row = e.target.parentElement.parentElement;
                                        const row_idx = +row.dataset.rowNum;
                                        all_tags[-2][row_idx] = "";
                                        row.remove();
                                        update_text();

                                        if ($(".awoo-tag-checker-fixer").length === 0) {
                                            this.tags_field.removeClass("awoo-disabled");
                                            $("#awoo-tag-checker-notice").remove();
                                        }
                                    }
                                })
                            })
                        ]
                    })            
                )
                
            })
        });

        if (forgot_rating) {
            const ratings = $(".post_rating");
            ratings.addClass("field_with_errors");
            ratings.one("input", _ => {
                ratings.removeClass("field_with_errors");
                $("#awoo-rating-notice").remove();

                if ($("#awoo-tag-checker-notice table").children().length === 0) {
                    $("#awoo-tag-checker-notice").remove();
                }
            });

            notice.prepend($("<tr></tr>", {
                id: "awoo-rating-notice",
                html: $("<th></th>", {
                    colspan: 3,
                    text: "Rating not selected!"
                })
            }));
        }

        this.tags_field.after(notice);

        const inputs = $(".awoo-tag-checker-fixer");
        inputs.autocomplete({
            source: async (request, respond) => respond(await Danbooru.Autocomplete.autocomplete_source(request.term, "tag")),
            close: e => {
                e.target.value = e.target.value.split(" ")[0];
                update_text();
            }
        });
        inputs.on("focus", e => $(e.target).data("uiAutocomplete").search(e.target.value));
        inputs.on("input", e => update_text());

        log.info("Special tags", special_tags);
        log.info("Normal tags", normal_tags);
        log.info("Found tags", found_tags);
        log.info("Tag categories", all_tags);

        return false;
    }
}

if (location.pathname.startsWith("/uploads/")
    || location.pathname.startsWith("/posts")
    || (location.pathname === "/posts" && $(".upload-image-container").length > 0)) {
    var OneUp = new OneUpFeature();
    var TagChecker = new TagCheckerFeature();
}
