// ==UserScript==
// @name        Upload stitcher
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/*/assets
// @match       *://cos.lycore.co/uploads/*/assets
// @match       *://donmai.moe/uploads/*/assets
// @version     1.0.0
// @author      TypeA2
// @description Easily stitch multi-image uploads
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/upload-stitch.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/upload-stitch.user.js
// @run-at      document-end
// ==/UserScript==

(function(){'use strict';class Logger {
  log(func, ...args) {
    func.apply(null, [`[${this.instance_name}]`, ...args]);
  }
  debug(...args) {
    this.log(console.debug, ...args);
  }
  info(...args) {
    this.log(console.info, ...args);
  }
  warn(...args) {
    this.log(console.warn, ...args);
  }
  error(...args) {
    this.log(console.error, ...args);
  }
  constructor(name) {
    this.instance_name = name;
  }
}function mount(vnode) {
  if ((vnode == null ? void 0 : vnode.vtype) === 1) {
    const {
      type,
      props
    } = vnode;
    if (type === "template") {
      /* Special handling for template so children are handled correctly */
      const child = props.children;
      props.children = undefined;
      const mounted = VM.hm("template", props, null);
      mounted.innerHTML = child.outerHTML;
      return mounted;
    }
  }
  return VM.mountDom(vnode);
}const logger = new Logger("upload-stitch");
const asset_count = $(".media-assets-container > article").length;
const square_sides = Math.sqrt(asset_count);
const can_square = Number.isInteger(square_sides);
if (asset_count > 1) {
  add_toolbar();
}
async function do_stitch(e) {
  e.preventDefault();
  const orientation = e.target.dataset.orientation;
  logger.info("Stitching", orientation);
  const dialog = mount(VM.h("div", null, VM.h("div", {
    id: "stitch-dialog"
  }), VM.h("div", {
    id: "stitch-preview"
  })));
  Danbooru.Utility.dialog("Stitching", dialog);
  const progress = msg => $("#stitch-dialog").append(`<p>${msg}</p>`);
  const progress_replace = msg => $("#stitch-dialog p:last-child").html(msg);
  const progress_append = msg => $("#stitch-dialog p:last-child").append(msg);
  const progress_raw = msg => $("#stitch-dialog").append(msg);

  // Do the stuff
  progress(`Stitching ${asset_count} assets`);
  const upload_id = $("#a-index .media-assets-container article:first-child").data("upload-id");
  progress(`Fetching upload ${upload_id}...`);
  const data = await (await fetch(`/uploads/${upload_id}.json?only=id,source,media_asset_count,upload_media_assets[id,media_asset_id],media_assets[id,md5,file_ext,image_width,image_height]`)).json();
  {
    // Must sort by upload_media_asset ID since media assets can finish processing in any order
    const ma_uma_map = new Map();
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
  const cdn_host = new URL($("#a-index article img.media-asset-preview-image").attr("src")).host;
  progress(`Using <code>${cdn_host}</cdn>`);
  progress(`Fetching images (0 / ${asset_count})`);
  const images = [];
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
  const canvas = mount(VM.h("canvas", {
    width: width,
    height: height,
    style: "max-width: 100%;"
  }));
  $("#stitch-preview").append(canvas);
  progress("Stitching...");
  paste_images(canvas, images, orientation);
  progress_append(" OK");
  progress("Compressing...");
  const blob = await new Promise(resolve => canvas.toBlob(b => resolve(b), "image/png"));
  const file = new File([blob], `${upload_id}_${orientation}_stitch.png`);
  progress_append(` ${blob == null ? void 0 : blob.size} bytes`);
  let source_data = null;
  if (data.source) {
    progress("Fetching source data...");
    source_data = await (await fetch(`/source.json?${new URLSearchParams({
      url: data.source
    })}`)).json();
    progress_append(" Done");
  }
  progress_raw(mount(VM.h("p", null, "Uploading... \xA0", VM.h("svg", {
    class: "icon svg-icon animate-spin",
    viewBox: "0 0 512 512"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M304 48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zm0 416c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM48 304c26.5 0 48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48zm464-48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM142.9 437c18.7-18.7 18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zm0-294.2c18.7-18.7 18.7-49.1 0-67.9S93.7 56.2 75 75s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zM369.1 437c18.7 18.7 49.1 18.7 67.9 0s18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9z"
  })))));
  try {
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
    window.location.href = new URL(`${window.location.origin}/uploads/${upload_id}?${query}`).toString();
  } catch (error) {
    progress_replace(`Uploading... Error: ${error.message}`);
    return;
  }
}
function validate_dimensions(upload, mode) {
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
    case "square":
      {
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
function final_dimensions(upload, mode) {
  switch (mode) {
    case "left":
    case "right":
      return [upload.media_assets.reduce((a, b) => a + b.image_width, 0), upload.media_assets[0].image_height];
    case "up":
    case "down":
      return [upload.media_assets[0].image_width, upload.media_assets.reduce((a, b) => a + b.image_height, 0)];
    case "square":
      return [upload.media_assets.slice(0, square_sides).reduce((a, b) => a + b.image_width, 0), upload.media_assets.filter((_, idx) => idx % square_sides === 1).reduce((a, b) => a + b.image_height, 0)];
  }
}
function paste_images(canvas, images, mode) {
  const ctx = canvas.getContext("2d");
  switch (mode) {
    case "right":
      {
        let x = 0;
        for (let i = 0; i < images.length; ++i) {
          ctx.drawImage(images[i], x, 0);
          x += images[i].width;
        }
        break;
      }
    case "left":
      {
        let x = 0;
        for (let i = images.length - 1; i >= 0; --i) {
          ctx.drawImage(images[i], x, 0);
          x += images[i].width;
        }
        break;
      }
    case "down":
      {
        let y = 0;
        for (let i = 0; i < images.length; ++i) {
          ctx.drawImage(images[i], 0, y);
          y += images[i].height;
        }
        break;
      }
    case "up":
      {
        let y = 0;
        for (let i = images.length - 1; i >= 0; --i) {
          ctx.drawImage(images[i], 0, y);
          y += images[i].height;
        }
        break;
      }
    case "square":
      {
        let x = 0;
        let y = 0;
        for (let i = 0; i < images.length; ++i) {
          ctx.drawImage(images[i], x, y);
          if (i % square_sides === square_sides - 1) {
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
  const menu = mount(VM.h("span", {
    class: "tab-menu-item docking-menu-tab"
  }, VM.h("div", {
    class: "popup-menu inline-flex items-center h-full",
    "data-hide-on-click": "true"
  }, VM.h("a", {
    class: "popup-menu-button inactive-link",
    href: "#",
    "x-on:click.prevent": "true",
    "x-on:mousedown.prevent": "true"
  }, VM.h("svg", {
    class: "icon svg-icon",
    viewBox: "0 0 448 512",
    width: "40",
    height: "40"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M120 256c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm160 0c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm104 56c-30.9 0-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56s-25.1 56-56 56z"
  }))), VM.h("ul", {
    class: "popup-menu-content"
  }, VM.h("li", null, "Stitch:"), VM.h("li", null, VM.h("a", {
    href: "#",
    class: "stitch-button",
    "data-orientation": "right"
  }, VM.h("svg", {
    class: "icon svg-icon",
    viewBox: "0 0 512 512",
    transform: "rotate(90)"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"
  })), "Horizontal (right)")), VM.h("li", null, VM.h("a", {
    href: "#",
    class: "stitch-button",
    "data-orientation": "left"
  }, VM.h("svg", {
    class: "icon svg-icon",
    viewBox: "0 0 512 512",
    transform: "rotate(-90)"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"
  })), "Horizontal (left)")), VM.h("li", null, VM.h("a", {
    href: "#",
    class: "stitch-button",
    "data-orientation": "down"
  }, VM.h("svg", {
    class: "icon svg-icon",
    viewBox: "0 0 512 512",
    transform: "rotate(180)"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"
  })), "Vertical (down)")), VM.h("li", null, VM.h("a", {
    href: "#",
    class: "stitch-button",
    "data-orientation": "up"
  }, VM.h("svg", {
    class: "icon svg-icon",
    viewBox: "0 0 512 512"
  }, VM.h("path", {
    fill: "currentColor",
    d: "M272 480h-96c-13.3 0-24-10.7-24-24V256H48.2c-21.4 0-32.1-25.8-17-41L207 39c9.4-9.4 24.6-9.4 34 0l175.8 176c15.1 15.1 4.4 41-17 41H296v200c0 13.3-10.7 24-24 24z"
  })), "Vertical (up)"))))));
  if (can_square) {
    $(menu).find(".popup-menu-content").append(mount(VM.h("li", null, VM.h("a", {
      href: "#",
      class: "stitch-button",
      "data-orientation": "square"
    }, VM.h("svg", {
      class: "icon svg-icon",
      viewBox: "0 0 512 512"
    }, VM.h("path", {
      fill: "currentColor",
      d: "M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm88 64v64H64V96h88zm56 0h88v64H208V96zm240 0v64H360V96h88zM64 224h88v64H64V224zm232 0v64H208V224h88zm64 0h88v64H360V224zM152 352v64H64V352h88zm56 0h88v64H208V352zm240 0v64H360V352h88z"
    })), "Grid (", square_sides, "\xD7", square_sides, ")"))));
  }
  $(menu).on("click", "a.stitch-button", do_stitch);
  $(menu).insertAfter("#a-index .tab-list > .tab:nth-child(3)");
  logger.info("Added toolbar", menu);
}
// Because it's hidden and this is easier
// https://github.com/danbooru/danbooru/blob/master/app/javascript/src/javascripts/utility.js#L155
async function upload_file(file) {
  const form_data = new FormData();
  form_data.append("upload[files][0]", file);
  const response = await fetch("/uploads.json", {
    method: "POST",
    headers: {
      "X-CSRF-Token": Danbooru.Utility.meta("csrf-token")
    },
    body: form_data
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
}})();