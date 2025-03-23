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

export abstract class Tag {
    private _tag_string: string;

    protected constructor(tag_string: string) {
        this._tag_string = tag_string;
    }

    public toString(): string {
        return this.tag_string();
    }

    /* Full name to be used in the tag string */
    public tag_string(): string { return this._tag_string; }

    /* Used to check for uniqueness, discarding any modifiers */
    public abstract unique_name(): string;

    /* Friendly display name */
    public abstract display_name(): string;

    /* Prefix-less tagname */
    public abstract search_string(): string;

    /* Properties applied to the tag */
    public abstract render_settings(): TagRenderSettings;
};

export class PendingTag extends Tag {
    public constructor(tag: string) {
        super(tag);
    }

    public unique_name(): string {
        return this.tag_string();
    }

    public display_name(): string {
        return this.tag_string();
    }

    public search_string(): string {
        return this.tag_string();
    }

    public render_settings(): TagRenderSettings {
        return {
            class_string: "awoo-tag-pending",
            can_remove: true,
            properties: {}
        };
    }

    public as_not_found(): NotFoundTag {
        return new NotFoundTag(this.tag_string());
    }
}

export class NotFoundTag extends Tag {
    public constructor(tag: string) {
        super(tag);
    }

    public unique_name(): string {
        return this.tag_string();
    }

    public display_name(): string {
        return this.tag_string();
    }

    public search_string(): string {
        return this.tag_string();
    }

    public render_settings(): TagRenderSettings {
        return {
            class_string: "awoo-tag-unknown",
            can_remove: true,
            properties: {}
        };
    }
}

export class FullDataTag extends Tag {
    private __category: NormalTagCategory;
    public get category() { return this.__category; }

    private __deprecated: boolean;
    public get deprecated() { return this.__deprecated; }

    public constructor(name: string, category: NormalTagCategory, is_deprecated: boolean) {
        super(name);

        this.__category = category;
        this.__deprecated = is_deprecated;
    }

    public unique_name(): string {
        return this.tag_string();
    }

    public display_name(): string {
        return this.tag_string();
    }

    public search_string(): string {
        return this.tag_string();
    }

    public render_settings(): TagRenderSettings {
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


export class NewTag extends Tag {
    private _category: string;
    public get category() { return this._category; }

    private _tag: string;
    public get tag() { return this._tag; }

    public constructor(category: NormalTagCategory, tag: string) {
        super(category + ":" + tag);

        this._category = PREFIX_TO_CATEGORY[category];
        this._tag = tag;
    }

    public unique_name(): string {
        return this.tag;
    }

    public display_name(): string {
        /* Don't show prefix on current artist */
        if (this.tag === $(".source-data-content a.tag-type-1").text()) {
            return this.tag;
        }

        return this.category + ":" + this.tag; 
    }

    public search_string(): string {
        return this.tag;
    }

    public render_settings(): TagRenderSettings {
        return {
            class_string: `awoo-tag-${this.category}`,
            can_remove: true,
            properties: {
                "data-category": this.category
            }
        };
    }
}

export class MetaTag extends Tag {
    private _kind: MetaTagCategory;
    public get kind() { return this._kind; }

    private _value: string;
    public get value() { return this._value; }

    public constructor(kind: MetaTagCategory, value: string) {
        super(kind + ":" + value);

        this._kind = kind;
        this._value = value;
    }

    public unique_name(): string {
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

    public display_name(): string {
        switch (this.kind) {
            case "rating": return `${this.kind}:${this.value[0]}`;
        }

        return this.kind + ":" + this.value;
    }

    public search_string(): string {
        return this.tag_string();
    }

    public render_settings(): TagRenderSettings {
        return {
            class_string: "awoo-tag-meta-tag",
            can_remove: this.kind !== "rating",
            properties: {
                "data-meta-category": this.kind,
                "data-meta-value": this.value
            }
        };
    }
}
