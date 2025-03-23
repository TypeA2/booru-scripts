import { createStore } from "solid-js/store";
import { FullDataTag, NewTag, NormalTagCategory, NotFoundTag, PendingTag, Tag } from "./Tag";
import TagRegistry from "./TagRegistry";
import Logger from "./Logger";
import { batch } from "solid-js";

interface TagListSate { [name: string]: Tag };

const logger = new Logger("TagList");

const RESOLVE_DELAY = 500 as const;

export class TagList {
    public constructor() {
        this._state = createStore<TagListSate>({});

        setInterval(() => TagRegistry.resolve_pending(tags => {
            batch(() => {
                tags.forEach(tag => this._store_tag(tag));
            });
        }), RESOLVE_DELAY);
    }

    private _state: ReturnType<typeof createStore<TagListSate>>;

    private _has_tag(tag: string) { return Object.prototype.hasOwnProperty.call(this._state[0], tag); }
    private _store_tag(tag: Tag) { this._state[1](tag.unique_name(), tag); }
    private _remove_tag(tag: Tag) { this._state[1](tag.unique_name(), undefined); }

    public get length() {
        return Object.keys(this._state[0]).length;
    }

    public contains(tag: string): boolean {
        return Object.prototype.hasOwnProperty.call(this._state[0], tag);
    }

    public get(tag: string): Tag {
        return this._state[0][tag];
    }

    public filter(cond: (t: Tag) => boolean): Tag[] {
        return Object.values(this._state[0]).filter(cond);
    }

    public has(cond: (T: Tag) => boolean): boolean {
        for (const tag of Object.values(this._state[0])) {
            if (cond(tag)) {
                return true;
            }
        }

        return false;
    }

    public clear() {
        for (const tag of Object.values(this._state[0])) {
            this._remove_tag(tag);
        }
    }

    public add_tag(tag: Tag) {
        this.add_tags([ tag ]);
    }

    public add_tags(tags: Tag[]) {
        TagRegistry.store_tags(tags);

        tags.map(t => this._store_tag(t));
    }

    public remove_tag(tag: Tag) {
        this._remove_tag(tag);
    }

    public remove_tags(tags: Tag[]) {
        tags.forEach(tag => this._remove_tag(tag));
    }

    public has_tag(tag: string): boolean {
        return this._has_tag(tag);
    }

    public count_for_category(category: NormalTagCategory): number {
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

    public get tags(): Tag[] {
        return Object.values(this._state[0]);
    }

    public get tag_names(): string[] {
        return Object.values(this._state[0]).map(t => t.tag_string());
    }

    public get tag_string(): string {
        return this.tag_names.join(" ");
    }

    public has_pending(): boolean {
        for (const tag of Object.values(this._state[0])) {
            if (tag instanceof NotFoundTag || tag instanceof PendingTag) {
                return true;
            }
        }

        return false;
    }

    public has_deprecated(): boolean {
        for (const tag of Object.values(this._state[0])) {
            if (tag instanceof FullDataTag && tag.deprecated) {
                return true;
            }
        }

        return false;
    }
}
