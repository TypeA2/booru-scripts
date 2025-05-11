declare namespace Danbooru {
    declare namespace Utility {
        function delay(ms: number): Promise<void>;
        function meta(key: string): string;
        function test_max_width(width: number): boolean;

        function notice(msg: string | HTMLElement | JSXElement, permanent: boolean): void;
        function error(msg: string | HTMLElement | JSXElement): void;
    }

    declare namespace RelatedTag {
        function update_selected(e: InputEvent): void;
        function toggle_tag(e: InputEvent): void;
    }

    declare namespace CurrentUser {
        function data(key: "comment-threshold" | "id" | "level" | "per-page"): number;
        function data(key: "default-image-size" | "ip-addr" | "level-string" | "name" | "theme" | "time-zone"): string;
        function data(key: "disable-categorized-saved-searches" | "disable-mobile-gestures" | "disable-post-tooltips"
                        | "disable-tagged-filenames" | "enable-desktop-mode" | "enable-private-favorites"
                        | "enable-safe-mode" | "is-admin" | "is-anonymous" | "is-approver" | "is-banned"
                        | "is-builder" | "is-contributor" | "is-gold" | "is-member" | "is-moderator"
                        | "is-owner" | "is-platinum" | "is-restricted" | "is-verified" | "new-post-navigation-layout"
                        | "receive-email-notifications" | "requires-verification" | "save-data"
                        | "show-deleted-children" | "show-deleted-posts"): boolean;
    }
}
