export enum Page {
    UploadSingle,
    UploadMultiple,

    ViewPost,
    ViewMediaAsset,

    UserFeedbacks,

    ViewUser,

    ViewArtist
}

const page_conditions: [RegExp | ((path: string) => boolean), Page][] = [
    [ /^\/uploads\/\d+$/, Page.UploadSingle ],
    [ /^\/uploads\/\d+\/assets\/\d+$/, Page.UploadSingle ],
    [ path => path === "/posts" && $(".upload-image-container").length > 0, Page.UploadSingle ],

    [ /^\/uploads\/\d+\/assets$/, Page.UploadMultiple ],
    [ /^\/posts\/\d+$/, Page.ViewPost ], 
    [ /^\/media_assets\/\d+$/, Page.ViewMediaAsset ],

    [ /^\/user_feedbacks$/, Page.UserFeedbacks ],

    [ /^\/users\/\d+$/, Page.ViewUser ],
    [ /^\/profile$/, Page.ViewUser ],

    [ /^\/artists\/\d+$/, Page.ViewArtist ],

];

export abstract class PageManager {
    private static _page: Page;

    static {
        const path = location.pathname;
    
        for (const [match, page] of page_conditions) {
            if (match instanceof RegExp && path.match(match)) {
                this._page = page;
                break;
            } else if (typeof match === "function" && match(path)) {
                this._page = page;
                break;
            }
        }
    }

    public static current_page(): Page {
        return this._page;
    }

    public static is_danbooru(): boolean {
        return document.location.host.endsWith("donmai.us");
    }
}
