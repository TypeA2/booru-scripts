import { createStore } from "solid-js/store";
import { ApiTag, CATEGORY_TO_NAME, MetaTag, NormalTag, NormalTagCategory, Tag } from "./Tag";
import Logger from "./Logger";
import { batch } from "solid-js";

const logger = new Logger("TagList");

interface TagListState { [name: string]: Tag };
interface PendingState { [name: string]: NormalTag };

const RESOLVE_DELAY = 500 as const;

export class TagList {
    public constructor() {
        this._state = createStore<TagListState>({});
        this._pending = createStore<PendingState>({});

        setInterval(async () => {
            const tags = Object.values(this._pending[0]);

            if (tags.length === 0) {
                return;
            }
            
            const res = await this._resolve_pending(tags);

            const remaining_tags: PendingState = {};
            tags.forEach(tag => remaining_tags[tag.unique_name()] = tag);

            // FIXME: This is inefficient, but batch() seems to break it somehow
            res.forEach(tag => {
                /* Got removed in the meantime
                 * This is slightly race-condition-y but not critical so it's fine
                 **/
                if (this._has_pending(tag)) {
                    this._remove_pending(tag);
                    this._store_tag(tag);
                }
                
                delete remaining_tags[tag.unique_name()];
            });

            /* Not found */
            Object.values(remaining_tags).forEach(tag => {
                tag.is_new = true;
                this._remove_pending(tag);
                this._store_tag(tag);
            });

        }, RESOLVE_DELAY);
    }

    private _state: ReturnType<typeof createStore<TagListState>>;
    private _pending: ReturnType<typeof createStore<PendingState>>;

    public apply_tag(tag: string | Tag) {
        tag = Tag.parse_tag(tag);

        /* Metatags are handled separately */
        if (tag instanceof MetaTag) {

            switch (tag.unique_name()) {
                case "parent": {
                    if (!tag.is_add) {
                        /* Parent is being removed */
                        this._remove_tag(tag);
                        return;
                    }
                    break;
                }
            }

            /* Store as normal */
            this._store_tag(tag);
            return;
        }

        /* Move to pending if already present */
        if (this._has_tag(tag)) {
            this._remove_tag(tag);
        }

        if (tag.is_add) {
            /* Potentially overwrite existing pending tags */
            this._store_pending(tag);
        }
    }

    public apply_tags(tags: (string | Tag)[]) {
        batch(() => {
            tags.map(t => this.apply_tag(t));
        });
    }

    public remove_tag(tag: string | Tag) {
        tag = Tag.parse_tag(tag);

        this._remove_tag(tag);
        this._remove_pending(tag);
    }

    public remove_tags(tags: (string | Tag)[]) {
        batch(() => {
            tags.map(t => this.remove_tag(t));
        });
    }

    private _has_tag(tag: Tag) { return Object.prototype.hasOwnProperty.call(this._state[0], tag.unique_name()); }
    private _has_pending(tag: Tag) { return Object.prototype.hasOwnProperty.call(this._pending[0], tag.unique_name()); }
    private _store_tag(tag: Tag) { this._state[1](tag.unique_name(), tag); }
    private _store_pending(tag: Tag) { this._pending[1](tag.unique_name(), tag); }
    private _remove_tag(tag: Tag) { this._state[1](tag.unique_name(), undefined); }
    private _remove_pending(tag: Tag) { this._pending[1](tag.unique_name(), undefined); }

    public get length() {
        return Object.keys(this._state[0]).length + Object.keys(this._pending[0]).length;
    }

    public get tags(): Tag[] {
        return [
            ...Object.values(this._state[0]),
            ...Object.values(this._pending[0]),
        ];
    }

    public get tag_string(): string {
        return this.tags.map(t => t.tag_string()).join(" ");
    }

    public get tag_names(): string[] {
        return this.tags.map(t => t.tag_string());
    }

    public filter(cond: (t: Tag) => boolean): Tag[] {
        return this.tags.filter(cond);
    }

    public has(cond: (T: Tag) => boolean): boolean {
        for (const tag of this.tags) {
            if (cond(tag)) {
                return true;
            }
        }

        return false;
    }

    public contains(tag: string | Tag): boolean {
        tag = Tag.parse_tag(tag);

        return this._has_tag(tag) || this._has_pending(tag);
    }

    public get(tag: string): Tag {
        return this._state[0][tag] || this._pending[0][tag];
    }

    public count_for_category(category: NormalTagCategory): number {
        let count = 0;

        for (const tag of this.tags) {
            if (tag instanceof NormalTag && tag.category === category) {
                count += 1;
            }
        }

        return count;
    }

    public clear() {
        for (const tag of this.tags) {
            this._remove_tag(tag);
        }
    }

    private async _resolve_pending(tags: NormalTag[]): Promise<NormalTag[]> {
        const PAGE_SIZE = 1000;

        if (tags.length > 1000) {
            throw new Error(`Exceeding page size: ${tags.length} > ${PAGE_SIZE}`);
        }

        if (tags.length === 0) {
            return [];
        }

        logger.debug("Requesting", tags.map(t => t.display_name()));

        const request_data = {
            limit: PAGE_SIZE,
            search: {
                name: tags.map(t => t.unique_name()),
                hide_empty: true,
            },
            only: "id,name,is_deprecated,category",
            _method: "get"
        };

        logger.debug("POST /tags.json", request_data);

        const res = await $.ajax(`/tags.json`, {
            method: "POST",
            dataType: "json",
            data: request_data
        }) as ApiTag[];

        const add_map: { [name: string]: boolean } = {};
        tags.forEach(tag => add_map[tag.unique_name()] = tag.is_add);

        return res.map(data =>
            new NormalTag(
                data.name,
                CATEGORY_TO_NAME[data.category.toString()],
                data.is_deprecated,
                false,
                add_map[data.name]
            ));
    }
}
