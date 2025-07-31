import Feature from "./Feature";
import Logger from "./Logger";
import Options from "./Options";
import { Page, PageManager } from "./PageManager";

import css from "./UITweaks.scss";

const logger = new Logger("UITweaks");

interface PostVersion {
    added_tags: string[];
    rating_changed: boolean;
    source_changed: boolean;
    version: number;
}

export default class UITweaks extends Feature {
    public constructor() {
        super("UITweaks");

        Options.register_feature("UITweaks", this);
    }

    private _feedback_direct_link(): void {
        const make_link = (id: number) => <a href={`/user_feedbacks/${id}`}>View</a> as HTMLElement;

        const table = $("#user-feedbacks-table");

        table.find("th.control-column").text("Control");
        
        table.find("tbody > tr").each((_, el) => {
            const tr = $(el);

            const link = make_link(tr.data("id"));

            if (tr.data("creator-id") === Danbooru.CurrentUser.data("id")) {
                tr.find(".control-column")
                    .append(" | ")
                    .append(link);
            } else {
                tr.find(".control-column").append(link);
            }
        });
    }

    private _profile_stats(): void {
        const rows = $(".user-statistics tr").map<JQuery<HTMLTableRowElement>>((_, e: HTMLTableRowElement) => $(e));

        const get_row = (header: string) => {
            for (const row of rows) {
                if (row.find("th").text() === header) {
                    return row.find("td");
                }
            }

            throw new Error(`Couldn't find row: ${header}`);
        };

        const get_count = (hdr: "favorite" | "note-update" | "post-update" | "post-upload"): number =>
            $(document.body).data(`user-${hdr}-count`);

        get_row("Posts").append(`(${((get_count("post-upload") / get_count("post-update") * 100) || 0).toFixed(2)}% of post changes)`);

        const deleted = get_row("Deleted Posts");
        deleted.append(`(${((+deleted.find("a").text() / get_count("post-upload") * 100) || 0).toFixed(2)}% of uploads)`);
    }

    private async _view_count(): Promise<void> {
        const views = await $.get(`https://isshiki.donmai.us/post_views/${$(document.body).data("post-id")}`);
        $("#post-info-favorites").after(<li id="post-info-views">
            {`Views: ${views}`}
        </li>);
    }

    private async _recent_tags(): Promise<void> {
        /* Based on Nameless Contributor's userscript */

        const versions: PostVersion[] = await $.getJSON("/post_versions.json", {
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

    private _create_artist_wiki(): void {
        const container = $("#view-artist-link").parent();

        if (container.has("#view-wiki-link").length === 0) {
            const artist_name = new URLSearchParams($("#a-show > div.flex.items-center.gap-2 > a").attr("href").split("?")[1]).get("tags");
            container.prepend(<>
                <a id="view-wiki-link" href={`/wiki_pages/new?wiki_page[title]=${artist_name}`} target="_blank">Create wiki</a>
                <span> | </span>
            </>);
        }
    }

    public enable(): void {
        logger.info("Enabling");
        GM_addStyle(css);

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

    public disable(): void {
        logger.info("Disabling");
    }
}
