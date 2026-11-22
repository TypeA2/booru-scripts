import './meta.js?userscript-metadata';

import Logger from '../utils/Logger';
import { mount } from '../utils/awoo-jsx';

const logger = new Logger("upload-stitch");

const asset_count = $(".media-assets-container > article").length;
const square_sides = Math.sqrt(asset_count);
const can_square = Number.isInteger(square_sides);

if (asset_count > 1) {
    add_toolbar();
}

interface MediaAsset {
    id: number;
    md5: string;
    file_ext: string;
    image_width: number;
    image_height: number;
}

interface Upload {
    id: number;
    source: string | null;
    media_asset_count: number;
    upload_media_assets: { id: number; media_asset_id: number; }[];
    media_assets: MediaAsset[];
}

interface SourceData {
    page_url: string;
    artist: { artists: { id: number; name: string }[] };
    artist_commentary: { dtext_title: string; dtext_description: string; };
}

type StitchMode = "right" | "left" | "down" | "up" | "square";

async function do_stitch(e: JQuery.ClickEvent) {
    e.preventDefault();

    const orientation = (e.target as HTMLElement).dataset.orientation as StitchMode;

    logger.info("Stitching", orientation);

    const dialog = mount(<div>
        <div id="stitch-dialog"></div>
        <div id="stitch-preview"></div>
    </div>);

    Danbooru.Utility.dialog("Stitching", dialog);

    const progress = (msg: string) => $("#stitch-dialog").append(`<p>${msg}</p>`);
    const progress_replace = (msg: string) => $("#stitch-dialog p:last-child").html(msg);
    const progress_append = (msg: string) => $("#stitch-dialog p:last-child").append(msg);
    const progress_raw = (msg: HTMLElement) => $("#stitch-dialog").append(msg);

    // Do the stuff
    progress(`Stitching ${asset_count} assets`);

    const upload_id = $("#a-index .media-assets-container article:first-child").data("upload-id");

    progress(`Fetching upload ${upload_id}...`);
    const data = await (await fetch(`/uploads/${upload_id}.json?only=id,source,media_asset_count,upload_media_assets[id,media_asset_id],media_assets[id,md5,file_ext,image_width,image_height]`)).json() as Upload;
    
    {
        // Must sort by upload_media_asset ID since media assets can finish processing in any order
        const ma_uma_map = new Map<number, number>();
        for (const uma of data.upload_media_assets) {
            ma_uma_map.set(uma.media_asset_id, uma.id);
        }

        data.media_assets.sort((a, b) => (ma_uma_map.get(a.id) || 0) - (ma_uma_map.get(b.id) || 0));
    }
    
    progress_append(" Done");

    progress("Validating data...");
    const msg = validate_dimensions(data, orientation);

    if (msg !== null) {
        progress(`Invalid stitch: ${msg}`);
        return;
    } else {
        progress_append(" OK");
    }

    const [width, height] = final_dimensions(data, orientation);
    const is_lossy_lossless = !data.media_assets.every(e => e.file_ext === "png");

    progress(`Stitching to ${width}&times;${height}, ${is_lossy_lossless ? "<code>lossy_lossless</code>" : "already lossless"}`);


    const cdn_host = new URL($("#a-index article img.media-asset-preview-image").attr("src") as string).host;
    progress(`Using <code>${cdn_host}</cdn>`);


    progress(`Fetching images (0 / ${asset_count})`);

    const images: HTMLImageElement[] = [];
    
    for (let i = 0; i < data.media_asset_count; ++i) {
        const b1 = data.media_assets[i].md5.substring(0, 2);
        const b2 = data.media_assets[i].md5.substring(2, 4);

        const url = `https://${cdn_host}/original/${b1}/${b2}/${data.media_assets[i].md5}.${data.media_assets[i].file_ext}`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        await img.decode();

        images.push(img);

        progress_replace(`Fetching images (${i + 1} / ${asset_count})`);
    }

    const canvas = mount(<canvas width={width} height={height} style="max-width: 100%;"></canvas>) as HTMLCanvasElement;
    $("#stitch-preview").append(canvas);

    progress("Stitching...");
    paste_images(canvas, images, orientation);
    progress_append(" OK");

    progress("Compressing...");
    const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b as Blob), "image/png"));
    const file = new File([blob], `${upload_id}_${orientation}_stitch.png`);
    progress_append(` ${blob?.size} bytes`);

    if (blob.size > 100*1024*1024) {
        // Too big to upload, abort
        progress_raw(mount(<span style="color: red;">File too large, download it below and compress it elsewhere</span>));
        return;
    }

    let source_data: SourceData | null = null;
    if (data.source) {
        progress("Fetching source data...");
        source_data = await (await fetch(`/source.json?${new URLSearchParams({ url: data.source })}`)).json();
        progress_append(" Done");
    }

    const do_upload = async (new_tab: boolean = false) => {
        try {
            progress_raw(mount(
                <p>
                    Uploading... &nbsp;
                    <svg class="icon svg-icon animate-spin" viewBox="0 0 512 512">
                        <path fill="currentColor" d="M304 48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zm0 416c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM48 304c26.5 0 48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48zm464-48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM142.9 437c18.7-18.7 18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zm0-294.2c18.7-18.7 18.7-49.1 0-67.9S93.7 56.2 75 75s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zM369.1 437c18.7 18.7 49.1 18.7 67.9 0s18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9z"/>
                    </svg>
                </p>
            ));

            const upload_id = await upload_file(file);

            progress_replace("Uploading... done");

            progress("Redirecting...");

            let tags = "stitched";

            if (is_lossy_lossless) {
                tags += " lossy-lossless";
            }

            const query = new URLSearchParams();

            if (data.source && source_data) {
                query.append("post[source]", source_data.page_url);
                query.append("post[artist_commentary][original_title]", source_data.artist_commentary.dtext_title);
                query.append("post[artist_commentary][original_description]", source_data.artist_commentary.dtext_description);

                for (const artist of source_data.artist.artists) {
                    tags += ` ${artist.name}`;
                }
            }

            query.append("post[tag_string]", tags);

            const url = new URL(`${window.location.origin}/uploads/${upload_id}?${query}`).toString();

            if (new_tab) {
                window.open(url, "_blank")?.focus();

                // @ts-expect-error jQuery UI's type definitions are borked and I don't want to fix it
                $(dialog).dialog("destroy");
            } else {
                window.location.href = url;
            }

        } catch (error) {
            progress_replace(`Uploading... Error: ${(error as Error).message}`);
            return;
        }
    };

    if (auto_upload_enabled()) {
        await do_upload();
    } else {
        const prompt = mount(<p>Upload in: <button type="button" class="btn button-primary" data-target="here">This tab</button>&nbsp;<button type="button" class="btn button-primary" data-target="there">New tab</button></p>);

        $(prompt).on("click", "button", async (e) => {
            const target = e.target.dataset.target as "here" | "there";

            e.target.disabled = true;
            $(prompt).find("button").prop("disabled", "disabled");
            $(prompt).find(`button[data-target]:not([data-target=${target}])`).remove();
            await do_upload(target === "there");
        });

        progress_raw(prompt);
    }
}

function auto_upload_enabled(): boolean {
    return GM_getValue("typea2:upload-stitch-auto-mode", true);
}

function set_auto_upload(state: boolean) {
    GM_setValue("typea2:upload-stitch-auto-mode", state);
}

function validate_dimensions(upload: Upload, mode: StitchMode): string | null {
    switch (mode) {
        case "left":
        case "right":
            // Same height
            for (let i = 1; i < upload.media_asset_count; ++i) {
                if (upload.media_assets[i - 1].image_height != upload.media_assets[i].image_height) {
                    return "Not all images are the same height";
                }
            }
            break;

        case "up":
        case "down":
            // Same width
            for (let i = 1; i < upload.media_asset_count; ++i) {
                if (upload.media_assets[i - 1].image_width != upload.media_assets[i].image_width) {
                    return "Not all images are the same width";
                }
            }
            break;

        case "square": {
            // Everything in a column is the same width
            // Everything in a row is the same height
            const col_widths = [];
            const row_heights = [];

            for (let i = 0; i < upload.media_asset_count; ++i) {
                const row = Math.floor(i / square_sides);
                const col = i % square_sides;

                if (row === row_heights.length) {
                    row_heights.push(upload.media_assets[i].image_height);
                } else if (upload.media_assets[i].image_height !== row_heights[row]) {
                    return `Row ${i} has inconsistent heights`;
                }

                if (col === col_widths.length) {
                    col_widths.push(upload.media_assets[i].image_width);
                } else if (upload.media_assets[i].image_width !== col_widths[row]) {
                    return `Row ${i} has inconsistent widths`;
                }
            }

            break;
        }
    }

    return null;
}

function final_dimensions(upload: Upload, mode: StitchMode): [number, number] {
    switch (mode) {
        case "left":
        case "right":
            return [
                upload.media_assets.reduce((a, b) => a + b.image_width, 0),
                upload.media_assets[0].image_height,
            ];

        case "up":
        case "down":
            return [
                upload.media_assets[0].image_width,
                upload.media_assets.reduce((a, b) => a + b.image_height, 0),
            ];

        case "square":
            return [
            upload.media_assets.slice(0, square_sides).reduce((a, b) => a + b.image_width, 0),
            upload.media_assets.filter((_, idx) => idx % square_sides === 1).reduce((a, b) => a + b.image_height, 0),
        ];
    }
}

function paste_images(canvas: HTMLCanvasElement, images: HTMLImageElement[], mode: StitchMode) {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    switch (mode) {
        case "right": {
            let x = 0;
            for (let i = 0; i < images.length; ++i) {
                ctx.drawImage(images[i], x, 0);

                x += images[i].width;
            }
            break;
        }

        case "left": {
            let x = 0;
            for (let i = images.length - 1; i >= 0; --i) {
                ctx.drawImage(images[i], x, 0);

                x += images[i].width;
            }
            break;
        }

        case "down": {
            let y = 0;
            for (let i = 0; i < images.length; ++i) {
                ctx.drawImage(images[i], 0, y);

                y += images[i].height;
            }
            break;
        }

        case "up": {
            let y = 0;
            for (let i = images.length - 1; i >= 0; --i) {
                ctx.drawImage(images[i], 0, y);

                y += images[i].height;
            }
            break;
        }

        case "square": {
            let x = 0;
            let y = 0;
            for (let i = 0; i < images.length; ++i) {
                ctx.drawImage(images[i], x, y);

                if ((i % square_sides) === (square_sides - 1)) {
                    // end of row
                    y += images[i].height;
                    x = 0; 
                } else {
                    x += images[i].width;
                }
            }
            break;
        }
    }
}

function add_toolbar() {
    const menu = mount(<span class="tab-menu-item docking-menu-tab">
        <div class="popup-menu inline-flex items-center h-full" data-hide-on-click="true">
            <a class="popup-menu-button inactive-link" href="#" {...{"x-on:click.prevent": "true", "x-on:mousedown.prevent": "true"}}>
                <svg class="icon svg-icon" viewBox="0 0 448 512" width="40" height="40">
                    <path fill="currentColor" d="M120 256c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm160 0c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm104 56c-30.9 0-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56s-25.1 56-56 56z"/>
                </svg>
            </a>
            <ul class="popup-menu-content">
                <li data-hide-on-click="false"><label for="upload-mode" style="font-weight: bold;"><input type="checkbox" class="toggle-switch" id="upload-mode" checked={auto_upload_enabled()} /> Auto upload</label></li>
                <li>
                    <a href="#" class="stitch-button" data-orientation="right">
                        <svg class="icon svg-icon" viewBox="0 0 512 512" transform="rotate(90)">
                            <path fill="currentColor" d="M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"/>
                        </svg>
                        Horizontal (right)
                    </a>
                </li>
                <li>
                    <a href="#" class="stitch-button" data-orientation="left">
                        <svg class="icon svg-icon" viewBox="0 0 512 512" transform="rotate(-90)">
                            <path fill="currentColor" d="M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"/>
                        </svg>
                        Horizontal (left)
                    </a>
                </li>
                <li>
                    <a href="#" class="stitch-button" data-orientation="down">
                        <svg class="icon svg-icon" viewBox="0 0 512 512" transform="rotate(180)">
                            <path fill="currentColor" d="M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"/>
                        </svg>
                        Vertical (down)
                    </a>
                </li>
                <li>
                    <a href="#" class="stitch-button" data-orientation="up">
                        <svg class="icon svg-icon" viewBox="0 0 512 512">
                            <path fill="currentColor" d="M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"/>
                        </svg>
                        Vertical (up)
                    </a>
                </li>
            </ul>
        </div>
    </span>);

    if (can_square) {
        $(menu).find(".popup-menu-content").append(mount(
            <li>
                <a href="#" class="stitch-button" data-orientation="square">
                    <svg class="icon svg-icon" viewBox="0 0 512 512">
                        <path fill="currentColor" d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm88 64v64H64V96h88zm56 0h88v64H208V96zm240 0v64H360V96h88zM64 224h88v64H64V224zm232 0v64H208V224h88zm64 0h88v64H360V224zM152 352v64H64V352h88zm56 0h88v64H208V352zm240 0v64H360V352h88z"/>
                    </svg>
                    Grid ({square_sides}&times;{square_sides})
                </a>
            </li>
        ));
    }

    $(menu).on("click", "a.stitch-button", do_stitch);

    $(menu).on("input", "input#upload-mode", e => set_auto_upload(e.target.checked));

    $(menu).insertAfter("#a-index .tab-list > .tab:nth-child(3)");
    logger.info("Added toolbar", menu);
}

interface SourceData {
    source: string;
}

// Because it's hidden and this is easier
// https://github.com/danbooru/danbooru/blob/master/app/javascript/src/javascripts/utility.js#L155
async function upload_file(file: File): Promise<number> {
    const form_data = new FormData();
    form_data.append("upload[files][0]", file);

    const response = await fetch("/uploads.json", {
        method: "POST",
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") },
        body: form_data,
    });

    let upload = await response.json();
    while (upload.status !== "completed") {
        if (upload.status === "error") {
            throw new Error(_.escape(upload.error || "Unknown error"));
        }

        await new Promise(resolve => setTimeout(resolve, 250));
        upload = $.get(`/uploads/${upload.id}.json`);
    }

    return upload.id;
}
