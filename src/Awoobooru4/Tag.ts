import Logger from "./Logger";

/* https://github.com/danbooru/danbooru/blob/a9593dda98db89576278defc06eb20650faa784d/app/logical/tag_category.rb#L16 */
export const PREFIX_TO_CATEGORY = {
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
} as const;

export const SHORT_PREFIX = {
    general: "gen",
    artist: "art",
    copyright: "copy",
    character: "char",
    meta: "meta"
} as const;

export const NormalTagCategories = [ "artist", "copyright", "character", "general", "meta" ] as const;
export const MetaTagCategories = [
    "rating", "parent", "child",
    "source", "pool", "newpool",
    "locked", "fav", "favgroup",
    "upvote", "downvote"
] as const;
export const TagPrefixes = [
    ...NormalTagCategories,
    ...MetaTagCategories,
    ...Object.values(SHORT_PREFIX)
] as string[];

export type NormalTagCategory = typeof NormalTagCategories[number];
export type MetaTagCategory = typeof MetaTagCategories[number];
export type TagPrefix = typeof TagPrefixes[number];

const logger = new Logger("Tag");

export const CATEGORY_TO_NAME = {
    "0": "general",
    "1": "artist",
    "3": "copyright",
    "4": "character",
    "5": "meta"
} as const;

export const CATEGORY_TO_ID = {
    general: 0,
    artist: 1,
    copyright: 3,
    character: 4,
    meta: 5,
} as const;

export const GIRL_COUNTERS = [ "1girl", "2girls", "3girls", "4girls", "5girls", "6+girls" ] as const;
export const BOY_COUNTERS = [ "1boy", "2boys", "3boys", "4boys", "5boys", "6+boys" ] as const;
export const OTHER_COUNTERS = [ "1other", "2others", "3others", "4others", "5others", "6+others" ] as const;

export function sanitize_tag_string(tags: string) {
    return tags.split(/([\s\n])/)
        .map(tag => tag.toLowerCase())
        .filter(s => /\S/.test(s))
        .sort();
}

export interface ApiTag {
    id: number,
    name: string,
    category: 0 | 1 | 3 | 4 | 5,
    is_deprecated: boolean
}

export interface TagRenderSettings {
    class_string: string;
    can_remove: boolean;
    properties: { [key: string]: string };
}

const PARENT_CHILD_TEXT_ARGS = [
    "active", "any", "appealed",
    "banned", "deleted", "flagged",
    "modqueue", "none", "pending",
    "unmoderated"
];

export abstract class Tag {
    /* Is this tag being added or removed */
    private _is_add: boolean;

    protected constructor(is_add: boolean) {
        this._is_add = is_add;
    }

    public get is_add(): boolean {
        return this._is_add;
    }

    public toString(): string {
        return this.display_name();
    }

    public abstract unique_name(): string;
    public abstract display_name(): string;
    public abstract tag_string(): string;
    public abstract search_string(): string;

    public abstract class_string(): string;

    public static parse_tag(tag: string | Tag): Tag {
        if (tag instanceof Tag) {
            return tag;
        }

        const is_add = tag[0] !== "-";
        const raw_tag = is_add ? tag : tag.slice(1);

        /* If it's a valid tag prefix (sometimes normal tags contain a :) */
        if (raw_tag.indexOf(":") > 1 && TagPrefixes.includes(raw_tag.split(":", 1)[0])) {
            const [prefix, name] = raw_tag.split(":", 2);
    
            if (prefix in PREFIX_TO_CATEGORY) {
                /* Tag with explicit category */
                return new NormalTag(name, PREFIX_TO_CATEGORY[prefix], false, true, is_add);

            } else if (MetaTagCategories.includes(prefix as MetaTagCategory)) {
                /**
                 * A few considerations:
                 * * `rating` cannot be negated
                 * * `parent` is handled locally (TODO: maybe don't do this?)
                 * * All other negated metatags are passed through as-is
                 */
                switch (prefix) {
                    case "rating":
                        if (!is_add || !"gsqe".includes(name[0])) {
                            return null;
                        }
                        break;
    
                    case "parent":
                    case "child":
                        if (!/^\d+$/.test(name) && !PARENT_CHILD_TEXT_ARGS.includes(name)) {
                            return null;
                        }
                        break;
                }
    
                return new MetaTag(
                    prefix as MetaTagCategory,
                    prefix === "rating" ? name[0] :
                    name,
                    is_add
                );
            }
                
            return null;
        }

        /* If the tag is already present somewhere on the page we can now it's type */
        const el = $(`[data-tag-name="${raw_tag}"]`);
        if (el.length > 0) {
            for (const cls of el[0].classList) {
                if (cls.startsWith("tag-type-")) {
                    return new NormalTag(raw_tag, CATEGORY_TO_NAME[cls[9]], false, false, is_add);
                }
            }
        }
    
        return new NormalTag(raw_tag, "unknown", false, false, is_add);
    }
};

/* Any normal tag, new or not */
export class NormalTag extends Tag {
    private _tag_name: string;
    private _tag_category: NormalTagCategory | "unknown";
    private _is_deprecated: boolean;

    public constructor(
        tag_name: string,
        tag_category: NormalTagCategory | "unknown",
        is_deprecated: boolean,
        is_new: boolean,
        is_add: boolean) {

        super(is_add);

        this._tag_name = tag_name;
        this._tag_category = tag_category;
        this._is_deprecated = is_deprecated;
        this.is_new = is_new;
    }

    public get category() {
        return this._tag_category;
    }

    public get category_id(): number{
        return CATEGORY_TO_ID[this._tag_category];
    }

    public get is_deprecated(): boolean {
        return this._is_deprecated;
    }

    public is_new: boolean;


    public unique_name(): string {
        return this._tag_name;
    }

    public display_name(): string {
        return this._tag_name;
    }

    public tag_string(): string {
        let res = this.is_add ? "" : "-";
        if (this.is_new && this._tag_category !== "unknown") {
            res += this._tag_category + ":";
        }
        return res + this._tag_name;
    }

    public search_string(): string {
        return this._tag_name;
    }

    public class_string(): string {
        if (this._is_deprecated || this.is_new && this._tag_category === "unknown") {
            return "awoo-tag-error";
        }

        return "";
    }
}

/* Any meta tag, these do special things */
export class MetaTag extends Tag {
    /* Metatags are a key/value pair */
    private _key: MetaTagCategory;
    private _value: string;

    public constructor(key: MetaTagCategory, value: string, is_add: boolean) {
        super(is_add);

        this._key = key;
        this._value = value;
    }

    public get key(): string { return this._key; }
    public get value(): string { return this._value; }

    public unique_name(): string {
        switch (this._key) {
            /* These may have only 1 instance */
            case "parent":
            case "locked":
            case "rating":
                return this._key;
        }

        /* Intentionally ignore `is_add` */
        return `${this._key}:${this._value}`;
    }

    public display_name(): string {
        return `${this.is_add ? "" : "-"}${this._key}:${this._value}`;
    }

    public tag_string(): string {
        if (this.is_add) {
            return `${this._key}:${this._value}`;
        } else {
            return `-${this._key}:${this._value}`;
        }
    }

    public search_string(): string {
        return `${this._key}:${this._value}`;
    }

    public class_string(): string {
        return "awoo-tag-meta-tag";
    }
}

unsafeWindow["NormalTag"] = NormalTag;
unsafeWindow["MetaTag"] = MetaTag;
