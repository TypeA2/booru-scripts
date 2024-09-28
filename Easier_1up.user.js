// ==UserScript==
// @name        Easier 1up
// @namespace   Violentmonkey Scripts
// @match       *://*.donmai.us/uploads/*
// @grant       none
// @version     1.0.2
// @author      TypeA2
// @description 2024-06-18 (initial), 2024-06-19 (current)
// @downloadURL https://gist.github.com/TypeA2/bff1474c0f4ca2188cf21897d4e4b2dd/raw/Easier_1up.user.js
// @updateURL   https://gist.github.com/TypeA2/bff1474c0f4ca2188cf21897d4e4b2dd/raw/Easier_1up.user.js
// @run-at      document-end
// ==/UserScript==

"use strict";

function copy_tags(post, parent) {
    /* Copy tags and rating, omit commentary tags */

    /* All except commentary tags, but there's one gentag:
     * https://danbooru.donmai.us/tags?search[name_or_alias_matches]=*commentary*&limit=1000
     */
    const tags = post.dataset.tags.split(" ").filter(t => t === "social_commentary" || t.indexOf("commentary") == -1);

    document.querySelector(`input.radio_buttons[value='${post.dataset.rating}']`).checked = true;

    if (parent) {
        document.getElementById("post_parent_id").value = post.dataset.id;
    } else {
        tags.push("child:" + post.dataset.id);
    }

    const tags_field = document.getElementById("post_tag_string");
    tags_field.value = tags.join(" ") + " ";
    $(tags_field).trigger("input");

    document.querySelector(".source-tab").click();

    Danbooru.Utility.notice("Succesfully copied tags. Please check the commentary tags.", false);
}

function process_node(node) {
    if (node.className !== "iqdb-posts") {
        return;
    }

    for (const post of node.getElementsByTagName("article")) {
        const similarity = post.querySelector(".iqdb-similarity-score");
        const links = similarity.parentNode;

        const set_parent = document.createElement("a");
        set_parent.innerText = "parent";
        set_parent.href = "#";
        set_parent.addEventListener("click", () => copy_tags(post, true));

        const set_child = document.createElement("a");
        set_child.innerText = "child";
        set_child.href = "#";
        set_child.addEventListener("click", () => copy_tags(post, false));

        links.appendChild(document.createTextNode(" | "));
        links.appendChild(set_parent);
        links.appendChild(document.createTextNode(" | "));
        links.appendChild(set_child);
    }
}

function mutation_callback(mutations, observer) {
    for (const mutation of mutations) {
        switch (mutation.type) {
            case "childList":
                mutation.addedNodes.forEach(process_node);
                break;
        }
    }
}

(()=>{
    const similar = document.getElementById("iqdb-similar");
    const observer = new MutationObserver(mutation_callback);
    const config = {
        subtree: true,
        childList: true,
    }
    observer.observe(similar, config);
})();