import Feature from "./Feature";
import Logger from "./Logger";
import Options from "./Options";
import { sanitize_tag_string } from "./Tag";

const logger = new Logger("OneUp");

const DO_NOT_COPY_LIST = [
    "corrupted_twitter_file",
    "md5_mismatch",
    "resolution_mismatch",
    "bad_id",
    "bad_link",
    "bad_source",
    "resized",
    "resolution_mismatch",
    "source_larger",
    "source_smaller",
    "duplicate",
    "pixel-perfect_duplicate",

    /* Auto-added */
    "lowres", "highres", "absurdres", "incredibly_absurdres",
    "wide_image", "tall_image",
    "animated_gif", "animated_png",
    "flash", "video", "ugoira",
    "exif_rotation",
    "non-repeating_animation",
    "sound",
    "non-web_source",
];

export default class OneUpFeature extends Feature {
    constructor() {
        super("OneUp");

        Options.register_feature("oneup", this);
    }

    private copy_tags(data: { post: HTMLElement, mode: "parent" | "another_child" | "child" }, e: MouseEvent): void {
        e.preventDefault();
        
        if (data.mode === "another_child") {
            $("#post_tag_string").val($("#post_tag_string").val() + ` child:${data.post.dataset.id}`);
            $("#post_tag_string").trigger("input");
            
            /* This isn't actually a component, eslint */
            // eslint-disable-next-line solid/components-return-once
            return;
        }

        /* Exclude some tags:
         * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*_commentary&limit=1000
         * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*_sample&limit=1000
         * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=bad_*_id&limit=1000
         */
        const tags = sanitize_tag_string(data.post.dataset.tags)
            .filter(tag =>
                tag === "social_commentary"
                || !(
                       tag === "commentary"
                    || tag === "commentary_request"
                    || tag.endsWith("_commentary")
                    || tag.endsWith("_sample")
                    || tag.match(/bad_[a-z]+_id/)
                    || DO_NOT_COPY_LIST.includes(tag)
                )
            );

        const was_translated = tags.includes("translated");

        if (was_translated) {
            /* Assume Danbooru only gives us correct tag strings */
            tags.splice(tags.indexOf("translated"), 1);
        }

        switch (data.mode) {
            case "parent":
                $("#post_parent_id").val(data.post.dataset.id);
                tags.push(`parent:${data.post.dataset.id}`);
                break;

            case "child":
                tags.push(`child:${data.post.dataset.id}`);
                break;
        }


        $("#post_tag_string")
            .val(tags.join(" "))
            .trigger("input");

        // TODO: fix
        // tags_field.scrollTop(tags_field[0].scrollHeight);

        $(`#post_rating_${data.post.dataset.rating}`).click();

        $(".tab.source-tab")[0].click();

        if (was_translated) {
            Danbooru.Utility.notice(<>
                <span> Tags copied. Please check the </span>
                <a class="tag-type-5" href="/wiki_pages/commentary" target="_blank">commentary</a>
                <span> and </span>
                <a class="tag-type-5" href="/wiki_pages/translation_request" target="_blank">translation</a>
                <span> tags.</span>
            </>, false);
        } else {
            Danbooru.Utility.notice(<>
                <span> Tags copied. Please check the </span>
                <a class="tag-type-5" href="/wiki_pages/commentary" target="_blank">commentary</a>
                <span> tags.</span>
            </>, false);
        }
    }

    private process_elements(): void {
        for (const post of document.querySelectorAll<HTMLElement>(".iqdb-posts article")) {
            const target = post.querySelector<HTMLElement>(":has(> div > .iqdb-similarity-score)");

            target.appendChild(<div>
                Make: 
                <a class="awoo-link" href="#" onClick={[this.copy_tags.bind(this), { post, mode: "parent" }]}>parent</a>
                <span class="awoo-sep"> | </span>
                <a class="awoo-link" href="#" onClick={[this.copy_tags.bind(this), { post, mode: "another_child"}]}>nth child</a>
                <span class="awoo-sep"> | </span>
                <a class="awoo-link" href="#" onClick={[this.copy_tags.bind(this), { post, mode: "child" }]}>child</a>
            </div> as Node);
        }
    }

    public enable(): void {
        logger.info("Enabling");

        const mutation_callback = (mutations: MutationRecord[], observer: MutationObserver) => {
            for (const mutation of mutations) {
                switch (mutation.type) {
                    case "childList":
                        for (const node of mutation.addedNodes) {
                            if ((node as HTMLElement).className === "iqdb-posts") {
                                this.process_elements();
                                observer.disconnect();
                                return;
                            }
                        }
                        break;
                }
            }
        };
        
        const observer = new MutationObserver(mutation_callback);
        observer.observe(document.getElementById("iqdb-similar"), { subtree: true, childList: true });
    }

    public disable(): void {
        logger.info("Disabling");
    }
}
