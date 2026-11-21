// ==UserScript==
// @name        Poipiku helper
// @namespace   https://github.com/TypeA2/booru-scripts
// @match       *://*.donmai.us/uploads/new*
// @match       *://*.donmai.us/uploads/*/assets*
// @match       *://*.donmai.us/uploads/*/assets/*
// @match       *://donmai.moe/uploads/new*
// @match       *://donmai.moe/uploads/*/assets*
// @match       *://donmai.moe/uploads/*/assets/*
// @match       *://poipiku.com/*/*.html
// @version     1.0.0
// @author      TypeA2
// @description Make uploading locked posts from Poipiku slightly less painful
// @connect     cdn.poipiku.com
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @resource    danbooru_icon https://danbooru.donmai.us/favicon.ico
// @downloadURL https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/poipiku-helper.user.js
// @updateURL   https://github.com/TypeA2/booru-scripts/raw/refs/heads/master/dist/poipiku-helper.user.js
// @run-at      document-end
// @grant       GM.addStyle
// @grant       GM.deleteValue
// @grant       GM.getResourceUrl
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.xmlHttpRequest
// ==/UserScript==

(function(){'use strict';function mount(vnode) {
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
}// Because it's hidden and this is easier
// https://github.com/danbooru/danbooru/blob/master/app/javascript/src/javascripts/utility.js#L155
async function upload_files(files) {
  const form_data = new FormData();
  for (let i = 0; i < files.length; ++i) {
    form_data.append(`upload[files][${i}]`, files[i]);
  }
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
}
async function source_data(url) {
  return fetch("/source.json?" + new URLSearchParams({
    url
  })).then(r => r.json());
}mount(VM.h("svg", {
  class: "icon svg-icon animate-spin",
  viewBox: "0 0 512 512"
}, VM.h("path", {
  fill: "currentColor",
  d: "M304 48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zm0 416c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM48 304c26.5 0 48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48zm464-48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM142.9 437c18.7-18.7 18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zm0-294.2c18.7-18.7 18.7-49.1 0-67.9S93.7 56.2 75 75s-18.7 49.1 0 67.9s49.1 18.7 67.9 0zM369.1 437c18.7 18.7 49.1 18.7 67.9 0s18.7-49.1 0-67.9s-49.1-18.7-67.9 0s-18.7 49.1 0 67.9z"
})));
const GEAR = mount(VM.h("svg", {
  class: "icon svg-icon",
  viewBox: "0 0 512 512"
}, VM.h("path", {
  fill: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
  d: "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
})));const POIPIKU_REGEX = /^https?:\/\/poipiku\.com\/(\d+)\/(\d+)\.html$/;
const UPLOAD_REGEX = /^\/uploads\/(\d+)\/assets$/;
const ASSETS_REGEX = /^\/uploads\/(\d+)\/assets\/(\d+)$/;
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
function decode_file_name(name) {
  const match = name.match(/^file:\/\/poipiku-(\d+)-(\d+)[.|_].+$/);
  if (match) {
    return {
      artist: parseInt(match[1]),
      post: parseInt(match[2])
    };
  }
  throw new Error(`Failed to parse filename: '${name}'`);
}
async function on_poipiku(user_id, post_id) {
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
  const upload_btn = mount(VM.h("a", {
    class: "IllustItemCmd danbo-btn",
    href: "#"
  }, VM.h("img", {
    src: await GM.getResourceUrl("danbooru_icon")
  })));
  $(upload_btn).on("click", async e => {
    e.preventDefault();
    const pw = $(".IllustItemExpandPass");
    try {
      await poipiku_probe_image(user_id, post_id, pw.val());
      process_poipiku_result(await poipiku_illust_detail(user_id, post_id, pw.val()));
    } catch (e) {
      DispMsg(e.message, 2500);

      // Focus on PW field if that's the problem
      if (e.message.includes("Password")) {
        pw.trigger("focus");
      }
    }
  });
  cmd_bar.prepend(upload_btn);
  const settings_btn = mount(VM.h("a", {
    class: "IllustItemCmd danbo-btn",
    href: "#"
  }, GEAR));
  $(settings_btn).on("click", async e => {
    e.preventDefault();
    const target = await GM.getValue("typea2:poipiku-upload-site", "danbooru");
    /* const custom_target = await GM.getValue("typea2:poipiku-custom-site", "");*/

    const tab = await GM.getValue("typea2:poipiku-upload-tab", "current");
    const settings_dialog = mount(VM.h("span", {
      id: "upload-target"
    }, VM.h("h4", null, "Upload to"), VM.h("label", {
      title: "danbooru.donmai.us"
    }, VM.h("input", {
      type: "radio",
      name: "upload-site",
      value: "danbooru"
    }), "Danbooru"), VM.h("label", {
      title: "donmai.moe"
    }, VM.h("input", {
      type: "radio",
      name: "upload-site",
      value: "donmai"
    }), "Donmai"), VM.h("label", {
      title: "testbooru.donmai.us"
    }, VM.h("input", {
      type: "radio",
      name: "upload-site",
      value: "testbooru"
    }), "Testbooru"), VM.h("h4", null, "Upload target"), VM.h("label", null, VM.h("input", {
      type: "radio",
      name: "upload-tab",
      value: "current"
    }), "Current tab"), VM.h("label", null, VM.h("input", {
      type: "radio",
      name: "upload-tab",
      value: "new"
    }), "New tab")));
    $(settings_dialog).find("#custom-site").prop("disabled", target !== "custom");
    $(settings_dialog).on("input", "input[name=upload-site]", async e => {
      const site = e.target.value;
      $(settings_dialog).find("#custom-site").prop("disabled", site !== "custom");
      await GM.setValue("typea2:poipiku-upload-site", site);
    }).on("input", "input[name=upload-tab]", async e => {
      await GM.setValue("typea2:poipiku-upload-tab", e.target.value);
    }).on("input", "#custom-site", async e => {
      await GM.setValue("typea2:poipiku-custom-site", e.target.value);
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
async function poipiku_probe_image(user_id, post_id, pw = null) {
  const res = await fetch("/f/ShowAppendFileF.jsp", {
    method: "POST",
    body: new URLSearchParams({
      UID: user_id.toString(),
      IID: post_id.toString(),
      PAS: pw || ""
    })
  }).then(r => r.json());
  if (res.result_num <= 0) {
    throw new Error(res.html);
  }
}
async function poipiku_illust_detail(user_id, post_id, pw = null) {
  const res = await fetch("/f/ShowIllustDetailF.jsp", {
    method: "POST",
    body: new URLSearchParams({
      ID: user_id.toString(),
      TD: post_id.toString(),
      PAS: pw || ""
    })
  }).then(r => r.json());
  if (res.error_code !== 0) {
    throw new Error(`API error: ${res.error_code}`);
  }
  return $(res.html).find("img").map((_, e) => e.src).get();
}
async function process_poipiku_result(urls) {
  const target = await GM.getValue("typea2:poipiku-upload-site", "danbooru");
  /* const custom_target = await GM.getValue("typea2:poipiku-custom-site", ""); */

  const tab = await GM.getValue("typea2:poipiku-upload-tab", "current");
  const params = new URLSearchParams();
  params.append("ref", window.location.toString());
  params.append("poipiku_auto_upload", "true");
  const href = {
    danbooru: "https://danbooru.donmai.us/uploads/new",
    donmai: "https://donmai.moe/uploads/new",
    testbooru: "https://testbooru.donmai.us/uploads/new"
    /* custom: custom_target */
  }[target] + "?" + params;
  const link = mount(VM.h("a", {
    target: tab === "current" ? "_self" : "_blank",
    href: href
  }));
  await GM.setValue("typea2:poipiku-upload-urls", JSON.stringify(urls));
  link.click();
}
async function on_new_upload(ref) {
  /* Fake start the upload, because we have to fetch data before we can start the real upload */
  const component = $(".file-upload-component");
  component.find(".spinner-icon").removeClass("hidden");
  component.find("input").attr("disabled", "disabled");
  component.find("#upload_source").val(ref || "");
  component.find("form").addClass("pointer-events-none cursor-wait opacity-50");
  const urls = JSON.parse(await GM.getValue("typea2:poipiku-upload-urls"));
  await GM.deleteValue("typea2:poipiku-upload-urls");
  const blobs = await Promise.all(urls.map(async url => {
    return GM.xmlHttpRequest({
      method: "GET",
      responseType: "blob",
      url
    }).then(r => [url, r.response]);
  }));
  if (blobs.find(([_, r]) => r.type === "text/xml")) {
    Danbooru.error("Failed to download image, please try again");
    component.find(".spinner-icon").addClass("hidden");
    component.find("input").removeAttr("disabled");
    component.find("form").removeClass("pointer-events-none cursor-wait opacity-50");
  } else {
    const files = blobs.map(([url, blob]) => new File([blob], "poipiku-" + new URL(url).pathname.slice(1).replace("/", "-")));
    const upload_id = await upload_files(files);
    window.location.href = "/uploads/" + upload_id;
  }
}
async function on_upload_view(upload_id) {
  const assets = await fetch(`/uploads/${upload_id}.json?only=upload_media_assets[source_url]`).then(r => r.json());
  if (!assets.upload_media_assets.find(f => !f.source_url.startsWith("file://poipiku-"))) {
    // Probably a poipiku post, fake it
    const {
      artist,
      post
    } = decode_file_name(assets.upload_media_assets[0].source_url);
    const table = render_source_data(artist, post);
    $(table).insertAfter("#a-index > h1");
  }
}
function render_source_data(artist_id, post_id) {
  const table = mount(VM.h("div", {
    class: "source-data card-outlined p-4 mt-4 mb-4"
  }, VM.h("table", {
    class: "source-data-content mt-2"
  }, VM.h("tbody", null, VM.h("tr", {
    id: "artist-links"
  }, VM.h("th", null, "Artist"), VM.h("td", null, VM.h("em", null, "Loading..."))), VM.h("tr", {
    class: "source-data-tags"
  }, VM.h("th", null, "Tags"), VM.h("td", null, VM.h("em", null, "Loading..."))), VM.h("tr", {
    class: "source-data-published-at"
  }, VM.h("th", null, "Published"), VM.h("td", null, VM.h("em", null, "None")))))));
  source_data(`https://poipiku.com/${artist_id}/${post_id}.html`).then(data => {
    if (data.artist.artists.length > 0) {
      $(table).find("#artist-links").remove();
      for (const artist of data.artist.artists.toReversed()) {
        // XXX: No profile URLs because the icons would need to be retrieved

        $(table).find("tbody").prepend(mount(VM.h("tr", null, VM.h("th", null, "Artist"), VM.h("td", null, VM.h("a", {
          class: "tag-type-1",
          href: `/artists/${artist.id}`
        }, artist.name)))));
      }
    } else {
      var _data$artist$display_;
      if (((_data$artist$display_ = data.artist.display_name) == null ? void 0 : _data$artist$display_.trim().length) === 0) {
        $(table).find("#artist-links > td > em").text("None");
      } else {
        $(table).find("#artist-links > td").html(mount(VM.h(VM.Fragment, null, VM.h("a", {
          rel: "externel noreferrer nofllow",
          href: `https://poipiku.com/${artist_id}/`
        }, data.artist.display_name), "\xA0(", VM.h("a", {
          target: "_blank",
          href: `/artists/new?${new URLSearchParams({
            "artist[source]": data.page_url
          })}`
        }, "Create new artist"), ")")));
      }
    }
    if (data.tags.length === 0) {
      $(table).find(".source-data-tags > td > em").text("None");
    } else {
      $(table).find(".source-data-tags > td").html(mount(VM.h("div", {
        class: "flex flex-wrap gap-1"
      }, data.tags.map(([name, url]) => VM.h("a", {
        rel: "external noreferrer nofollow",
        class: "source-data-tag chip-primary text-sm break-words",
        href: url
      }, name)))));
    }
    if ($("#p-single-asset-upload").length === 1) {
      // On upload page, so fill these fields too
      $("#post_artist_commentary_original_title").val(data.artist_commentary.dtext_title);
      $("#post_artist_commentary_original_description").val(data.artist_commentary.dtext_description);
      if (data.artist.artists.length > 0) {
        $("#post_tag_string").val($("#post_tag_string").val() + data.artist.artists.map(({
          id,
          name
        }) => `artist:${name}`)).trigger("input.danbooru");
      }
    }
  });
  return table;
}
function on_asset_view() {
  const encoded_source = $("#post_source").val();
  const {
    artist,
    post
  } = decode_file_name(encoded_source);
  $(".tab-panel.source-tab").prepend(render_source_data(artist, post));

  // decode_file_name would've failed if this isn't a match
  const [_, artist_id, filename] = encoded_source.match(/^file:\/\/poipiku-(\d+)-(.+)$/);
  $("#post_source").val(`https://cdn.poipiku.com/${artist_id}/${filename}`);
  $(".upload-no-source-warning").remove();
  const [__, post_id] = encoded_source.match(/^file:\/\/poipiku-\d+-(\d+).+$/);
  $(".upload-image-container > div > div:has(div.upload-warning-badges)").prepend(mount(VM.h("span", null, VM.h("a", {
    rel: "external noreferrer nofollow",
    title: `https://poipiku.com/${artist_id}/${post_id}.html`,
    class: "inline-block align-top",
    href: `https://poipiku.com/${artist_id}/${post_id}.html`
  }, VM.h("img", {
    class: "icon inline-block h-4",
    src: "/packs/static/poipiku-logo-625b08f0b6a6560a2506.png"
  })))));
}})();