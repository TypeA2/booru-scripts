import Logger from "./Logger";
import { Page, PageManager } from "./PageManager";
import { ApiTag, CATEGORY_TO_NAME, FullDataTag, MetaTag, MetaTagCategories, MetaTagCategory, NewTag, NormalTagCategory, PendingTag, PREFIX_TO_CATEGORY, Tag, TagPrefixes } from "./Tag";
import { array_chunks } from "./Util";

const logger = new Logger("TagRegistry");

const PARENT_CHILD_TEXT_ARGS = [
    "active", "any", "appealed",
    "banned", "deleted", "flagged",
    "modqueue", "none", "pending",
    "unmoderated"
];

export default abstract class TagRegistry {
    private constructor() { }

    public static parse_tag(tag: string): Tag {
        if (tag.indexOf(":") > 1 && TagPrefixes.includes(tag.split(":", 1)[0])) {
            const [prefix, name] = tag.split(":");
    
            if (prefix in PREFIX_TO_CATEGORY) {
                return new NewTag(prefix as NormalTagCategory, name);
            } else if (MetaTagCategories.includes(prefix as MetaTagCategory)) {
                switch (prefix) {
                    case "rating":
                        if (!"gsqe".includes(name[0])) {
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
    
                return new MetaTag(prefix as MetaTagCategory, name);
            }
                
            return null;
        }
    
        if (this.has_tag(tag)) {
            return this.get_tag(tag);
        }
    
        return new PendingTag(tag);
    }

    private static _known_tags: { [name: string]: Tag} = {};

    static {
        switch (PageManager.current_page()) {
            case Page.ViewPost: {
                const tags = [...$("#tag-list li[data-tag-name][data-is-deprecated]")] as HTMLLIElement[];
                logger.info("Gathering", tags.map(li => li.dataset.tagName).join(", "));

                for (const li of tags) {
                    for (const cls of li.classList) {
                        if (cls.startsWith("tag-type-")) {
                            this._store_tag(new FullDataTag(
                                li.dataset.tagName,
                                CATEGORY_TO_NAME[cls.slice(cls.length - 1)],
                                li.dataset.isDeprecated === "true"
                            ));
                            break;
                        }
                    }
                }
            }
        }
    }

    public static has_tag(tag: string): boolean {
        return Object.prototype.hasOwnProperty.call(this._known_tags, tag);
    }

    private static _store_tag(tag: Tag) {
        this._known_tags[tag.unique_name()] = tag;
    }

    public static store_tag(tag: Tag) {
        logger.info("Storing", tag.tag_string(), tag);
        this._store_tag(tag);
    }

    public static store_tags(tags: Tag[]) {
        logger.info("Storing", tags.map(t => t.tag_string()).join(", "));
        tags.map(t => this._store_tag(t));
    }

    public static get_tag(tag: string) {
        return this._known_tags[tag];
    }

    public static async resolve_pending(cb: (tags: Tag[]) => void) {
        const tags = new Map<string, PendingTag>(
            Object.entries(this._known_tags)
                .filter(([_, t]) => t instanceof PendingTag) as [string, PendingTag][]
        );

        if (tags.size === 0) {{
            return;
        }}

        logger.info("Resolving pending tags:", [...tags.keys()].join(", "));

        const result: Tag[] = [];

        for (const chunk of array_chunks([...tags.values().map(t => t.unique_name())], 1000)) {
            const found_tags = await this._search_tags(chunk);

            if (found_tags.length > 0) {
                logger.info("Found", found_tags.map(t => t.tag_string()).join(", "));
            }

            result.push(...found_tags) ;

            for (const tag of found_tags) {
                tags.delete(tag.unique_name());

                this._store_tag(tag);
            }
        }

        if (tags.size > 0) {
            logger.info("Didn't find", [...tags.values()].map(t => t.tag_string()).join(", "));
        }

        for (const [_, tag] of tags) {
            const nf = tag.as_not_found();

            this._store_tag(nf);
            result.push(nf);
        }

        cb(result);
    }

    private static async _search_tags(tags: string[]) : Promise<FullDataTag[]> {
        const PAGE_SIZE = 1000;

        if (tags.length > 1000) {
            throw new Error(`Exceeding page size: ${tags.length} > ${PAGE_SIZE}`);
        }

        const request_data = {
            limit: PAGE_SIZE,
            search: {
                name: tags,
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

        return res.map(data => new FullDataTag(data.name, CATEGORY_TO_NAME[data.category.toString()], data.is_deprecated));
    }
}
