import { For, createEffect, Show, createSignal, Accessor, Setter } from "solid-js";
import Feature from "./Feature";
import Options from "./Options";
import { Dynamic, render } from "solid-js/web";
import Logger from "./Logger";
import { TagList } from "./TagList";
import { MetaTag, NormalTag, NormalTagCategories, sanitize_tag_string, Tag } from "./Tag";
import Autocorrect from "./Autocorrect";
import { Page, PageManager } from "./PageManager";

const logger = new Logger("BetterTagBox");

const EDIT_ICON = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-icon">
        {/* Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. */}
        <path d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9
                88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9
                390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7
                16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8
                222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1
                17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7
                31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1
                401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4
                88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24
                10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1
                17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z"/>
    </svg> as SVGElement).cloneNode(true);

const DELETE_ICON = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="icon svg-icon">
        {/* Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. */}
        <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192
                210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7
                256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3
                297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
    </svg> as SVGElement).cloneNode(true);

const CATEGORY_TO_ID = {
    general: 0,
    artist: 1,
    copyright: 3,
    character: 4,
    meta: 5,
} as const;

function node_is_html(node: HTMLElement | Text): node is HTMLElement {
    return node.nodeType === Node.ELEMENT_NODE;
}

const GIRL_CHARCOUNTERS  = new Set([ "1girl",  "2girls",  "3girls",  "4girls",  "5girls",  "6+girls"  ]);
const BOY_CHARCOUNTERS   = new Set([ "1boy",   "2boys",   "3boys",   "4boys",   "5boys",   "6+boys"   ]);
const OTHER_CHARCOUNTERS = new Set([ "1other", "2others", "3others", "4others", "5others", "6+others" ]);

const MUTUALLY_EXCLUSIVE: (string | string[])[][] = [
    [ ...GIRL_CHARCOUNTERS ],
    [ ...BOY_CHARCOUNTERS ],
    [ ...OTHER_CHARCOUNTERS ],
    [ [ "commentary_request", "partial_commentary" ], "commentary" ],
    [ "solo", [ ...GIRL_CHARCOUNTERS.difference(new Set([ "1girl" ]))] ],
    [ "solo", [ ...BOY_CHARCOUNTERS.difference(new Set([ "1boy" ]))] ],
    [ "solo", [ ...OTHER_CHARCOUNTERS.difference(new Set([ "1other" ]))] ],
];

export default class BetterTagBoxFeature extends Feature {
    public constructor() {
        super("BetterTagBox");

        Options.register_feature("BetterTagBox", this);
    }

    private tag_list: TagList;

    private _error_tags: Accessor<Set<string>>;
    private _set_error_tags: Setter<Set<string>>;

    private get _tag_box_value() {
        /* Normalized */
        return ($("#awoo-tag-box").val() as string)
            .toLowerCase()
            .trim()
            .replace(" ", "_");
    }

    private set _tag_box_value(val: string) {
        $("#awoo-tag-box").val(val);
    }

    private _notice: Accessor<string[]>;
    private _set_notice: Setter<string[]>;
    
    private _can_submit(): boolean {
        let ret = true;
        const notice: string[] = [];
        const error_tags = new Set<string>();

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
        const deprecated_tags: NormalTag[] = [];
        const pending_tags: NormalTag[] = [];
        const unknown_tags: NormalTag[] = [];
        for (const tag of this.tag_list.tags.filter(t => t instanceof NormalTag)) {
            if (tag.is_deprecated) {
                deprecated_tags.push(tag);
            } else if (tag.category === "unknown") {
                if (tag.is_new) {
                    unknown_tags.push(tag);
                } else {
                    pending_tags.push(tag);
                }
            }
        }

        ret &&= ((deprecated_tags.length === 0) && (pending_tags.length === 0) && (unknown_tags.length === 0));

        if (deprecated_tags.length > 0) notice.push(`Deprecated: ${deprecated_tags.join(", ")}`);
        // This would be annoying
        // if (   pending_tags.length > 0) notice.push(`Pending: ${pending_tags.join(", ")}`);
        if (   unknown_tags.length > 0) notice.push(`Unknown: ${unknown_tags.join(", ")}`);
        ///
        
        /// No artist tag if required
        if (this.tag_list.count_for_category("artist") === 0) {
            if (!this.tag_list.contains("artist_request")
                && !this.tag_list.contains("official_art")) {

                notice.push("No artist");
                ret = false;
            }
        }
        ///

        /// No copyright tags
        if (this.tag_list.count_for_category("copyright") === 0 && !this.tag_list.contains("copyright_request")) {
            notice.push("No copyright");
            ret = false;
        }
        ///

        /// No mutually exclusive tags
        const tags = new Set(this.tag_list.tag_names);

        let i = 0;
        for (const group of MUTUALLY_EXCLUSIVE) {
            ++i;

            const matches: (string | string[])[] = [];

            for (const item of group) {
                if (typeof item === "string") {
                    for (const tag of tags) {
                        if (item === tag) {
                            matches.push(tag);
                            /* Tags are unique aslready */
                            break;
                        }
                    }
                } else {
                    const submatches: string[] = [];
                    for (const tag of tags) {
                        if (item.includes(tag)) {
                            submatches.push(tag);
                        }
                    }

                    if (submatches.length > 0) {
                        matches.push(submatches);
                    }
                }
            }

            if (matches.length > 1) {
                const flat_matches = matches.flat();
                
                notice.push(`Conflicting tags: ${flat_matches.sort().join(", ")}`);

                flat_matches.forEach(match => error_tags.add(match));
            }
        }
    
        ///

        /// No charcounters
        if (!tags.has("no_humans")
            && [...tags].filter(t => GIRL_CHARCOUNTERS.has(t) || BOY_CHARCOUNTERS.has(t) || OTHER_CHARCOUNTERS.has(t)).length === 0) {
            ret = false;
            notice.push("No charcounters");
        }
        ///

        /// No commentary tags despite being applicable
        if (!tags.has("commentary") && !tags.has("commentary_request") && !tags.has("symbol-only_commentary")
            && ($("#post_artist_commentary_title,#artist_commentary_original_title").val() || $("#post_artist_commentary_desc,#artist_commentary_original_description").val())) {
        
            ret = false;

            const commentary = ($("#post_artist_commentary_title,#artist_commentary_original_title").val() as string + $("#post_artist_commentary_desc,#artist_commentary_original_description").val() as string).trim();
            notice.push(`No commentary tags: "${commentary.slice(0, 10)}${commentary.length > 10 ? "..." : ""}"`);
        }

        if (($("#post_translated_commentary_title").val() || $("#post_translated_commentary_desc").val())
            && !tags.has("commentary") && !tags.has("partial_commentary")) {
            
            ret = false;
            notice.push("No (partial) commentary tag");
        }
        ///

        /// Commentary despite there being none
        // TODO: Handle specific *_commentary tags
        if (!($("#post_artist_commentary_title,#artist_commentary_original_title").val() || $("#post_artist_commentary_desc,#artist_commentary_original_description").val())
            && (tags.has("commentary") || tags.has("commentary_request") || tags.has("partial_commentary"))) {
            ret = false;

            const which: string[] = [];

            if (tags.has("commentary")) which.push("commentary");
            if (tags.has("commentary_request")) which.push("commentary_request");
            if (tags.has("partial_commentary")) which.push("partial_commentary");

            notice.push(`Unneeded commentary tags: ${which.join(", ")}`);

            which.forEach(t => error_tags.add(t));
        }

        this._set_notice(notice);
        this._set_error_tags(error_tags);

        return ret;
    }

    private _update_selected_tags() {
        $(".related-tags li").each((_, el) => {
            const li = $(el);

            const tag_name = li.find("a[data-tag-name]").data("tag-name");

            if (this.tag_list.has(t => t.unique_name() === tag_name)) {
                logger.debug("Selecting", li.find("a[data-tag-name]"));

                li.addClass("selected").find("input").prop("checked", true);
            } else {
                li.removeClass("selected").find("input").prop("checked", false);
            }
        });
    }

    private _toggle_tag(e: Event): void {
        e.preventDefault();
        e.stopImmediatePropagation();

        const tag: string = $(e.target).closest("li").find("a").data("tag-name");

        logger.info("Toggling", tag);

        if (this.tag_list.contains(tag)) {
            this.tag_list.remove_tag(tag);
        } else {
            this.tag_list.apply_tag(tag);
        }

        this._update_selected_tags();
    }

    private _tag_list_updated() {
        $("#post_tag_string").val(this.tag_list.tag_string).trigger("input.$");

        this._update_selected_tags();

        // logger.info("New tag string:", this.tag_list.tag_string);

        /* Apply tags that do things */
        if (this.tag_list.contains("rating")) {
            const tag = this.tag_list.get("rating") as MetaTag;
            const rating = tag.value[0];

            $(`#post_rating_${rating}`).prop("checked", true);
        }

        if (this.tag_list.contains("parent")) {
            const tag = this.tag_list.get("parent") as MetaTag;

            if (tag.is_add) {
                $("#post_parent_id").val(tag.value);
            } else {
                $("#post_parent_id").val("");
            }
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

    private _tag_box_keydown(e: KeyboardEvent) {
        switch (e.key) {
            case "Enter":
                this._try_add_tag(this._tag_box_value);
                this._tag_list_updated();

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
                break;

            case " ":
                e.preventDefault();

                this._try_add_tag(this._tag_box_value);
                break;

            case "ArrowLeft":
            case "Backspace":
                if (!this._tag_box_value && (e.target as HTMLInputElement).selectionStart === 0) {
                    e.preventDefault();
                    this._try_undo(e.key === "Backspace");
                }
                break;
        }
    }

    private _history: Tag[] = [];

    private _try_undo(select: boolean) {
        if (this._history.length === 0) {
            return;
        }

        const last = this._history.pop();

        this.tag_list.remove_tag(last);
        $("#awoo-tag-box").val(last.display_name());

        if (select) {
            $("#awoo-tag-box").select();
        }
    }

    private _try_add_tag(tag: string) {
        if (!tag) {
            return;
        }

        const is_add = tag[0] !== "-";

        /* Don't autocorrect tag removals, this gets in the way of removing typos  */
        if (is_add) {
            [tag, ] = Autocorrect.correct_tag(tag);
        }

        // const parsed = TagRegistry.parse_tag(is_negated ? tag.slice(1) : tag);
        const parsed = Tag.parse_tag(tag);

        logger.info("Adding", tag, parsed);

        if (!parsed) {
            /* Can't parse it, what to do? */
            $("#awoo-tag-box").parent().addClass("field_with_errors");
            $("#awoo-tag-box").one("input", e => e.target.parentElement.classList.remove("field_with_errors"));
            return;
        }
        
        $("#awoo-tag-box").parent().removeClass("field_with_errors");

        this.tag_list.apply_tag(parsed);

        /* Only store tag addition in history */
        this._history.push(parsed);

        this._tag_box_value = "";
    }

    private _set_tag_string(tags: string) {
        // this.tag_list.clear();

        this.tag_list.apply_tags(sanitize_tag_string(tags).map(Tag.parse_tag));
    }

    private _edit_tag(tag: Tag) {
        this.tag_list.remove_tag(tag);

        const value = tag.display_name();

        const tag_box: JQuery<HTMLInputElement> = $("#awoo-tag-box");
        tag_box.val(value);
        tag_box.select();
        tag_box[0].setSelectionRange(value.length, value.length);
        tag_box.autocomplete("search", value);
    }

    private async _commentary_changed(): Promise<void> {
        const source_title = $("#post_artist_commentary_title").val() as string;
        const source_description = $("#post_artist_commentary_desc").val() as string;

        /* Check for hashtag-only */
        let hashtag_only = true;

        if (source_title || !source_description) {
            hashtag_only = false;
        }

        if (hashtag_only) {
            const res: string = await $.ajax("/dtext_preview", {
                method: "POST",
                dataType: "html",
                data: {
                    body: source_description,
                    disable_mentions: true,
                    media_embeds: false
                }
            });

            const html = $(`<div>${res}</div>`);

            const walker = document.createTreeWalker(html[0], NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_ALL, (node: HTMLElement | Text) => {
                if (node_is_html(node)) {
                    if (node.tagName === "A" && node.innerText[0] === "#") {
                        /* Skip hashtag links */
                        return NodeFilter.FILTER_REJECT;
                    }
                }

                return NodeFilter.FILTER_ACCEPT;
            });


            while (walker.nextNode()) {
                const node = walker.currentNode as HTMLElement | Text;
                if (!node_is_html(node)) {
                    if (node.wholeText.trim()) {
                        /* Non-hashtag text */
                        hashtag_only = false;
                        break;
                    }
                }
            }
        }

        const commentary_tags = [
            "commentary",
            "hashtag-only_commentary"
        ];

        logger.info("Hashtag-only:", hashtag_only);

        if (hashtag_only) {
            this.tag_list.apply_tags(commentary_tags);
        } else {
            this.tag_list.remove_tags(commentary_tags);
        }

        this._tag_list_updated();
    }

    private make_tag_box() {
        const callback_builder = (category: string): (t: Tag) => boolean =>
            t => t instanceof NormalTag && !t.is_deprecated && t.category === category;

        // TODO: Put negated tags at the bottom
        const callbacks: ((t: Tag) => boolean)[] = [
            ...NormalTagCategories.map(callback_builder),
            t => t instanceof MetaTag,
            t => t instanceof NormalTag && t.is_deprecated,
            t => t instanceof NormalTag && t.category === "unknown",
        ];

        return <>
            <input type="text" id="awoo-tag-box" onKeyDown={e => { this._tag_box_keydown(e);} } />
            <span id="awoo-copy-controls">
                <a href="#" onClick={async e => {
                    e.preventDefault();
                    await navigator.clipboard.writeText(this.tag_list.tag_string);
                    Danbooru.Utility.notice("Tags copied", false);
                    $(e.target).blur();
                }}>Copy tags</a>
                &nbsp;-&nbsp;
                <a href="#" onClick={async e => {
                    e.preventDefault();
                    this._set_tag_string(await navigator.clipboard.readText());
                    Danbooru.Utility.notice("Tags pasted", false);
                    $(e.target).blur();
                }}>Paste tags</a>
            </span>
            <hr/>
            <Show when={this._notice().length > 0}>
                <div id="awoo-error-list" class="p-2 h-fit space-y-t card">
                    <ul>
                    <For each={this._notice()}>
                        {msg => <li class="awoo-tag-error">{msg}</li>}
                    </For>
                    </ul>
                </div>
                <hr/>
            </Show>
            <div id="awoo-tag-list" class="p-2 h-fit space-y-1 card">
                <ul>
                <For each={callbacks}>
                {cb =>
                    <For each={this.tag_list.filter(cb).sort()}>
                    {tag => {
                        return <Dynamic
                            component="li"
                            class={`awoo-tag ${tag.class_string()}${this._error_tags().has(tag.tag_string()) ? " awoo-tag-error" : ""}`}
                            data-tag-string={tag.tag_string()}
                            >
                            {/* 7x nbsp seems to work lol */}
                            <Show when={!(tag instanceof MetaTag && tag.key === "rating")} fallback="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;">
                                <a href="#" title={`Remove "${tag.display_name()}"`} on:click={e => {
                                    e.preventDefault();
                                    this.tag_list.remove_tag(tag);
                                }}>{DELETE_ICON()}</a>
                                &nbsp;
                                <a href="#" title={`Edit "${tag.display_name()}"`} on:click={e => {
                                    e.preventDefault();
                                    this._edit_tag(tag);
                                }}>{EDIT_ICON()}</a>
                                &nbsp;
                            </Show>

                            <Show when={tag instanceof NormalTag && tag.is_add && tag.category !== "unknown"}
                                fallback={<a href={`/posts?tags=${tag.search_string()}`} target="_blank">{tag.display_name()}</a>}>
                                <a href={`/posts?tags=${tag.search_string()}`}
                                    target="_blank"
                                    class={`tag-type-${CATEGORY_TO_ID[(tag as NormalTag).category]}`}>
                                    {tag.display_name()}
                                </a>
                            </Show>
                        </Dynamic>;
                    }}
                    </For>
                    }
                </For>
                </ul>
            </div>
        </>;
    }

    private async _autocomplete_source(query: string): Promise<JQuery<HTMLLIElement>[]> {
        const is_negated = query[0] === "-";

        const param = $.param({
            "search[query]": is_negated ? query.slice(1) : query,
            "search[type]": "tag_query",
            "version": "1",
            "limit": "20"
        });

        const res = await fetch(`/autocomplete?${param}`, {
            method: "GET",
            mode: "same-origin",
        });

        const items = $(await res.text()).find("li").toArray().map(e => $(e));

        items.forEach(e => e.data("original-query", query).data("is-negated", is_negated));
        return items;
    }

    public enable() {
        logger.info("Enabling");

        const _this = this;

        $.widget("ui.autocomplete", $.ui.autocomplete, {
            options: {
                delay: 0,
                minLength: 1,
                autoFocus: false,
                focus: () => false,
            },
            _create: function () {
                this.element.on("keydown.Autocomplete.tab", null, "tab", function (e: KeyboardEvent) {
                    const input = $(this as HTMLInputElement);
                    const instance = input.autocomplete("instance");
                    const menu = (instance.menu as unknown as JQuery<HTMLElement> & { element: JQuery<HTMLElement>; }).element;
                    
                    /* Not actually doing autocomplete */
                    if (!menu.is(":visible")) {
                        logger.info("Autocomplete not visible");
                        _this._try_add_tag(_this._tag_box_value);
                        e.preventDefault();
                        return;
                    }

                    /* Autocomplete is open but nothing in focus -> select first one */
                    if (menu.has(".ui-state-active").length === 0) {
                        const first = menu.find(".ui-menu-item").first();
                        const value = first.data("autocomplete-value") as string;

                        const sanitize = (s: string) => s
                            .toLowerCase()
                            .trim()
                            .replaceAll(" ", "_");

                        const original_query = sanitize(first.data("original-query") as string);
                        //const current_query = sanitize($("#awoo-tag-box").val() as string);
                        
                        const is_negated = original_query[0] === "-";
                        
                        input.autocomplete("close");
                        _this._try_add_tag((is_negated ? "-" : "") + value);
                    }

                    e.preventDefault();
                });

                this._super();
            },
            _renderItem: (list: JQuery<HTMLUListElement>, item: JQuery<HTMLLIElement>) => {
                item.data("ui-autocomplete-item", item);
                return list.append(item);
            }
        });


        $(document).off("change.danbooru", ".related-tags input");
        $(document).off("click.danbooru", ".related-tags .tag-list a");

        Danbooru.RelatedTag.update_selected = _ => this._update_selected_tags();
        Danbooru.RelatedTag.toggle_tag = e => this._toggle_tag(e);

        /* Just intercept all related tags clicks, this results in more consistent behavior */
        $("#related-tags-container").on("click", "a[data-tag-name]", e => this._toggle_tag(e as unknown as Event));

        const initial_tags = sanitize_tag_string($("#post_tag_string").val() as string || "");
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
        [this._error_tags, this._set_error_tags] = createSignal(new Set<string>());

        // eslint-disable-next-line solid/reactivity
        [this._notice, this._set_notice] = createSignal([] as string[]);

        createEffect(() => this._tag_list_updated());

        this._set_tag_string(initial_tags.map(tag => {
            if (tag === $(".source-data-content a.tag-type-1").text()) {
                return `artist:${tag}`;
            }

            return tag;
        }).join(" "));

        render(
            () => this.make_tag_box.bind(this),
            document.getElementById("post_tag_string").parentElement
        );

        /* Re-implement autocomplete to have more control */
        $("#awoo-tag-box").autocomplete({
            select: (_, ui) => {
                const el = ui.item as JQuery<HTMLLIElement>;

                $("#awoo-tag-box").val((el.data("is-negated") ? "-" : "") + el.data("autocomplete-value"));
                this._try_add_tag(this._tag_box_value);
            },
            source: async (req: { term: string; }, res: (data: JQuery<HTMLLIElement>[]) => void) => {
                res(await this._autocomplete_source(req.term));
            },
        });

        try {
            $("#post_tag_string")
                .removeAttr("data-autocomplete")
                .css("display", "none")
                .autocomplete("destroy");
        } catch {
            /* May throw since autocomplete may not be initialized yet, just ignore */
        }

        $("#post_tag_string").data("uiAutocomplete", { close: () => {} });

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
            this._set_tag_string($(e.target).val() as string);
        });

        $("#form input[type='submit']").after(<div class="input boolean optional inline-block" id="awoo-override-check-container">
            <input class="boolean optional" type="checkbox" id="awoo-override-check" on:change={_ => this._tag_list_updated()}/>
            <label class="boolean optional" for="awoo-override-check">Skip check</label>
        </div> as HTMLElement);

        $(document).one("danbooru:show-related-tags", _ => this._update_selected_tags());

        switch (PageManager.current_page()) {
            case Page.UploadSingle: {
                $("#awoo-tag-box").focus();

                /* Non-web sources don't have source data */
                if ($(".source-data").length > 0) {
                    new MutationObserver(_ => {
                        this._commentary_changed();
                    }).observe($(".source-data")[0].parentElement, { childList: true });
            
                    $("#post_artist_commentary_title,#post_artist_commentary_desc").on("change", _ => this._commentary_changed());
                }
                break;
            }

            case Page.ViewPost: {
                new MutationObserver(_ => {
                    if ($("#edit").is(":visible")) {
                        $("#awoo-tag-box").focus();
                    }
                }).observe($("#edit")[0], { attributes: true, attributeFilter: [ "style" ] });
                break;
            }
        }
    }

    public disable() {
        logger.info("Disabling");
    }
}
