import './meta.js?userscript-metadata';

import Logger from '../utils/Logger';
import { mount } from '../utils/awoo-jsx';
import * as DanbooruUtils from '../utils/DanbooruUtils';
import * as Icons from '../utils/icons';

const logger = new Logger("poipiku-helper");

const POIPIKU_REGEX = /^https?:\/\/poipiku\.com\/(\d+)\/(\d+)\.html$/;
const UPLOAD_REGEX = /^\/uploads\/(\d+)\/assets$/;
const ASSETS_REGEX = /^\/uploads\/(\d+)(\/assets\/(\d+))?$/;

const poipiku_match = document.location.href.match(POIPIKU_REGEX);
const search = new URLSearchParams(window.location.search);

if (poipiku_match) {
    on_poipiku(parseInt(poipiku_match[1]), parseInt(poipiku_match[2]));

} else if (window.location.pathname === "/uploads/new" && search.has("poipiku_auto_upload")) {
    on_new_upload(search.get("ref"));
} else {
    const upload_match = window.location.pathname.match(UPLOAD_REGEX);
    const asset_match = window.location.pathname.match(ASSETS_REGEX);

    if (upload_match) {
        on_upload_view(parseInt(upload_match[1]));
    } else if (asset_match) {
        on_asset_view();
    }
}

function decode_file_name(name: string): { artist: number; post: number; } {
    const match = name.match(/^file:\/\/poipiku-(\d+)-(\d+)[.|_].+$/);

    if (match) {
        return {
            artist: parseInt(match[1]),
            post: parseInt(match[2]),
        };
    }

    throw new Error(`Failed to parse filename: '${name}'`);
}

async function on_poipiku(user_id: number, post_id: number) {
    GM.addStyle(`
.IllustItemCmd.danbo-btn {
    padding: 4px 0 4px 20px;
    line-height: 1.2rem;
}

.icon.svg-icon {
    height: 1.2rem;
    color: #aaa;
}

#upload-target label {
    padding: 0 8px;
    line-height: 1rem;
}

#custom-site {
    margin-left: 8px;
}
`);

    const cmd_bar = $(".IllustItem .IllustItemCommandSub");
    
    const upload_btn = mount(
        <a class="IllustItemCmd danbo-btn" href="#">
            <img src={await GM.getResourceUrl("danbooru_icon")}/>
        </a>
    );

    $(upload_btn).on("click", async e => {
        e.preventDefault();

        const pw = $(".IllustItemExpandPass") as JQuery<HTMLInputElement> ;

        try {
            await poipiku_probe_image(user_id, post_id, pw.val());
            process_poipiku_result(await poipiku_illust_detail(user_id, post_id, pw.val()));
        } catch (e) {
            DispMsg((e as Error).message, 2500);

            // Focus on PW field if that's the problem
            if ((e as Error).message.includes("Password")) {
                pw.trigger("focus");
            }
        }
    });

    cmd_bar.prepend(upload_btn);
    
    const settings_btn = mount(
        <a class="IllustItemCmd danbo-btn" href="#">
            {Icons.GEAR}
        </a>
    );

    $(settings_btn).on("click", async e => {
        e.preventDefault();

        const target = await GM.getValue("typea2:poipiku-upload-site", "danbooru");
        /* const custom_target = await GM.getValue("typea2:poipiku-custom-site", "");*/

        const tab = await GM.getValue("typea2:poipiku-upload-tab", "current");

        const settings_dialog = mount(
            <span id="upload-target">
                <h4>Upload to</h4>
                <label title="danbooru.donmai.us"><input type="radio" name="upload-site" value="danbooru"/>Danbooru</label>
                <label title="donmai.moe"><input type="radio" name="upload-site" value="donmai"/>Donmai</label>
                <label title="testbooru.donmai.us"><input type="radio" name="upload-site" value="testbooru"/>Testbooru</label>
                {/* This doesn't actually work since the userscript won't be active */}
                {/*<p><label title="Custom"><input type="radio" name="upload-site" value="custom"/>Custom:<input type="url" id="custom-site" value={custom_target}/></label></p>*/}
                <h4>Upload target</h4>
                <label><input type="radio" name="upload-tab" value="current"/>Current tab</label>
                <label><input type="radio" name="upload-tab" value="new"/>New tab</label>
            </span>
        );

        $(settings_dialog).find("#custom-site").prop("disabled", target !== "custom");

        $(settings_dialog).on("input", "input[name=upload-site]", async e => {
            const site = (e.target as HTMLInputElement).value;
            $(settings_dialog).find("#custom-site").prop("disabled", site !== "custom");

            await GM.setValue("typea2:poipiku-upload-site", site);
        }).on("input", "input[name=upload-tab]", async e => {
            await GM.setValue("typea2:poipiku-upload-tab", (e.target as HTMLInputElement).value);
        }).on("input", "#custom-site", async e => {
            await GM.setValue("typea2:poipiku-custom-site", (e.target as HTMLInputElement).value);
        });

        $(settings_dialog).find(`input[value=${target}]`).prop("checked", true);
        $(settings_dialog).find(`input[value=${tab}]`).prop("checked", true);
        
        Swal.fire({
            title: "Configure uploading",
            html: settings_dialog
        });
    });

    cmd_bar.prepend(settings_btn);
}

interface PoipikuProbeResponse {
    html: string;
    result_num: number,
    tw_friendship: string;
};

interface PoipikuApiResponse {
    error_code: number;
    html: string;
    result: number;
};

async function poipiku_probe_image(user_id: number, post_id: number, pw: string | null = null): Promise<void> {
    const res = await fetch("/f/ShowAppendFileF.jsp", {
        method: "POST",
        body: new URLSearchParams({
            UID: user_id.toString(),
            IID: post_id.toString(),
            PAS: pw || "",
        }),
    }).then(r => r.json() as Promise<PoipikuProbeResponse>);

    if (res.result_num <= 0) {
        throw new Error(res.html);
    }
}

async function poipiku_illust_detail(user_id: number, post_id: number, pw: string | null = null): Promise<string[]> {
    const res = await fetch("/f/ShowIllustDetailF.jsp", {
        method: "POST",
        body: new URLSearchParams({
            ID: user_id.toString(),
            TD: post_id.toString(),
            PAS: pw || "",
        }),
    }).then(r => r.json() as Promise<PoipikuApiResponse>);

    if (res.error_code !== 0) {
        throw new Error(`API error: ${res.error_code}`);
    }

    return $(res.html).find("img").map((_, e) => e.src).get();
}

async function process_poipiku_result(urls: string[]) {
    const target = await GM.getValue("typea2:poipiku-upload-site", "danbooru");
    /* const custom_target = await GM.getValue("typea2:poipiku-custom-site", ""); */

    const tab = await GM.getValue("typea2:poipiku-upload-tab", "current");

    const params = new URLSearchParams();
    params.append("ref", window.location.toString());
    params.append("poipiku_auto_upload", "true");

    const href = ({
        danbooru: "https://danbooru.donmai.us/uploads/new",
        donmai: "https://donmai.moe/uploads/new",
        testbooru: "https://testbooru.donmai.us/uploads/new",
        /* custom: custom_target */
    })[target] + "?" + params;

    const link = mount(<a target={tab === "current" ? "_self" : "_blank"} href={href}/>);

    await GM.setValue("typea2:poipiku-upload-urls", JSON.stringify(urls));
    link.click();
}

async function on_new_upload(ref: string | null) {
    /* Fake start the upload, because we have to fetch data before we can start the real upload */
    const component = $(".file-upload-component");
    component.find(".spinner-icon").removeClass("hidden");
    component.find("input").attr("disabled", "disabled");
    component.find("#upload_source").val(ref || "");
    component.find("form").addClass("pointer-events-none cursor-wait opacity-50");

    const urls = JSON.parse(await GM.getValue("typea2:poipiku-upload-urls")) as string[];
    await GM.deleteValue("typea2:poipiku-upload-urls");
    
    const blobs = await Promise.all(urls.map(async url => {
        return GM.xmlHttpRequest({ method: "GET", responseType: "blob", url, }).then(r => [url, r.response] as [string, Blob]);
    }));

    if (blobs.find(([_, r]) => r.type === "text/xml")) {
        Danbooru.error("Failed to download image, please try again");
        component.find(".spinner-icon").addClass("hidden");
        component.find("input").removeAttr("disabled");
        component.find("form").removeClass("pointer-events-none cursor-wait opacity-50");
    } else {
        const files = blobs.map(([url, blob]) => new File([blob], "poipiku-" + new URL(url).pathname.slice(1).replace("/", "-")));
        
        const upload_id = await DanbooruUtils.upload_files(files);

        window.location.href = "/uploads/" + upload_id;
    }
}

async function on_upload_view(upload_id: number) {
    const assets =
        await fetch(`/uploads/${upload_id}.json?only=upload_media_assets[source_url]`)
                .then(r => r.json()) as { upload_media_assets: { source_url: string }[] };

    if (!assets.upload_media_assets.find(f => !f.source_url.startsWith("file://poipiku-"))) {
        // Probably a poipiku post, fake it
        const {artist, post} = decode_file_name(assets.upload_media_assets[0].source_url);
        const table = render_source_data(artist, post);
        $(table).insertAfter("#a-index > h1");
    }
}

function render_source_data(artist_id: number, post_id: number): HTMLElement {
    const table =
        mount(<div class="source-data card-outlined p-4 mt-4 mb-4">
            <table class="source-data-content mt-2">
                <tbody>
                    <tr id="artist-links">
                        <th>Artist</th>
                        <td><em>Loading...</em></td>
                    </tr>
                    <tr class="source-data-tags">
                        <th>Tags</th>
                        <td><em>Loading...</em></td>
                    </tr>
                    <tr class="source-data-published-at">
                        <th>Published</th>
                        <td><em>None</em></td>
                    </tr>
                </tbody>
            </table>
        </div>);

    DanbooruUtils.source_data(`https://poipiku.com/${artist_id}/${post_id}.html`).then(data => {
        if (data.artist.artists.length > 0) {

            $(table).find("#artist-links").remove();

            for (const artist of data.artist.artists.toReversed()) {
                // XXX: No profile URLs because the icons would need to be retrieved
                
                $(table).find("tbody").prepend(mount(<tr>
                    <th>Artist</th>
                    <td><a class="tag-type-1" href={`/artists/${artist.id}`}>{artist.name}</a></td>
                </tr>));
            }
        } else {
            if (data.artist.display_name?.trim().length === 0) {
                $(table).find("#artist-links > td > em").text("None");
            } else {
                $(table).find("#artist-links > td").html(mount(<>
                    <a rel="externel noreferrer nofllow" href={`https://poipiku.com/${artist_id}/`}>{data.artist.display_name}</a>
                        &nbsp;(<a target="_blank" href={`/artists/new?${new URLSearchParams({ "artist[source]": data.page_url })}`}>Create new artist</a>)
                </>));
            }
        }

        if (data.tags.length === 0) {
            $(table).find(".source-data-tags > td > em").text("None");
        } else {
            $(table).find(".source-data-tags > td").html(mount(<div class="flex flex-wrap gap-1">
                {data.tags.map(([name, url]) => <a rel="external noreferrer nofollow" class="source-data-tag chip-primary text-sm break-words" href={url}>{name}</a>)}
            </div>));
        }

        if ($("#p-single-asset-upload").length === 1) {
            // On upload page, so fill these fields too
            $("#post_artist_commentary_original_title").val(data.artist_commentary.dtext_title);
            $("#post_artist_commentary_original_description").val(data.artist_commentary.dtext_description);

            if (data.artist.artists.length > 0) {
                $("#post_tag_string").val(
                    $("#post_tag_string").val() as string + data.artist.artists.map(({id, name}) => ` artist:${name} `)
                ).trigger("input.danbooru");
            }
        }
    });

    return table;
}

function on_asset_view() {
    const encoded_source = $("#post_source").val() as string;

    const {artist, post} = decode_file_name(encoded_source);
    $(".tab-panel.source-tab").prepend(render_source_data(artist, post));

    // decode_file_name would've failed if this isn't a match
    const [_, artist_id, filename] = encoded_source.match(/^file:\/\/poipiku-(\d+)-(.+)$/) as RegExpMatchArray;

    $("#post_source").val(`https://cdn.poipiku.com/${artist_id}/${filename}`);
    $(".upload-no-source-warning").remove();

    const [__, post_id] = encoded_source.match(/^file:\/\/poipiku-\d+-(\d+).+$/) as RegExpMatchArray;

    $(".upload-image-container > div > div:has(div.upload-warning-badges)").prepend(mount(<span>
        <a rel="external noreferrer nofollow" title={`https://poipiku.com/${artist_id}/${post_id}.html`} class="inline-block align-top" href={`https://poipiku.com/${artist_id}/${post_id}.html`}>
            <img class="icon inline-block h-4" src="/packs/static/poipiku-logo-625b08f0b6a6560a2506.png"/>
        </a>
    </span>));
}
