// ==UserScript==
// @name        TypoFixer
// @namespace   Violentmonkey Scripts
// @match       *://*.donmai.us/posts*
// @match       *://*.donmai.us/uploads/*
// @grant       none
// @version     1.0.28
// @author      TypeA2
// @description 2024-05-02 (initial), 2024-09-23 (current)
// @downloadURL https://gist.github.com/TypeA2/2bd32138b4b9eb640e4eee1f48f584ee/raw/TypoFixer.user.js
// @updateURL   https://gist.github.com/TypeA2/2bd32138b4b9eb640e4eee1f48f584ee/raw/TypoFixer.user.js
// @run-at      document-end
// ==/UserScript==

/* Tag regexes adapted from ValidateTagInput */
const IGNORE_REGEX = /^(?:rating|-?parent|source|-?locked|-?pool|newpool|-?fav|child|-?favgroup|upvote|downvote|general|gen|artist|art|copyright|copy|co|character|char|ch|meta):/i

const replacements = [
    [ /(?<=.+[_|-])shrit/i, "shirt" ],
    [ /(?<!t)-(?=shirt)/i, "_" ],

    [ /(?<=.+[_|-])skrit/i, "skirt" ],
    [ /(?<!half)-(?=skirt)/i, "_" ],

    [ /(?<=.+[_|-])naisl/i, "nails" ],
    [ /(?<=.+)-(?=nails)/i, "_" ],

    [ /(?<=.+)-(?=sweater)/i, "_" ],
    
    [ /(?<=.+[_|-])shrots/i, "shorts" ],
    [ /(?<=.+)-(?=shorts)/i, "_" ],
    
    [ /(?<=.+)-(?=eyes)/i, "_" ],
    [ /(?<=.+)-(?=hair)/i, "_" ],
    [ /(?<=.+)-(?=dress)/i, "_" ],
    [ /(?<=.+)-(?=jacket)/i, "_" ],
    [ /(?<=.+)-(?=ribbon)/i, "_" ],
    [ /(?<=.+)-(?=hat)/i, "_" ],
    [ /(?<=.+)-(?=necktie)/i, "_" ],
    [ /(?<=(.+){2,})-(?=bow)/i, "_" ],
    [ /(?<=.+)-(?=brooch)/i, "_" ],
    [ /(?<=.+)-(?=belt)/i, "_" ],
    [ /(?<=.+)-(?=cardigan)/i, "_" ],
    [ /(?<=.+)-(?=corset)/i, "_" ],
    [ /(?<=.+)-(?=coat)/i, "_" ],
    
    [ /colalred(?=[_|-].+)/i, "collared" ],

    [ /(?<=.+[_|-])haiar/i, "hair" ],
    [ /(?<=.+[_|-])hairl/i, "hair" ],
    [ /(?<=.+[_|-])eyesl/i, "eyes" ],
    [ /(?<=.+[_|-])eys/i, "eyes" ],
    [ /(?<=.+[_|-])flwoer/i, "flower" ],
    [ /blakc(?=[_|-].+)/i, "black" ],

    [ "outdoros", "outdoors" ],
    [ "colalred_shirt", "collared_shirt" ],
    [ "earrinsg", "earrings" ],
    [ "sweatdorp", "sweatdrop" ],
    [ "tongue-out", "tongue_out" ],
    [ "character-name", "character_name" ],
    [ "thigh-strap", "thigh_strap" ],
    [ "anger-vein", "anger_vein" ],
    [ "bleu_eyes", "blue_eyes" ],
    [ "hicket", "hickey" ],
    [ "colared_shirt", "collared_shirt" ],
    [ "lbush", "blush" ],
    [ "cat_eras", "cat_ears" ],
    [ "ponytial", "ponytail" ],
    [ "sidelocsk", "sidelocks" ],
    [ "film-grain", "film_grain" ]
];

function correct_tag(tag) {
    for (const [before, after] of replacements) {
        if (before instanceof RegExp) {
            if (before.test(tag)) {
                return [ true, tag.replace(before, after) ];
            }
        } else if (typeof before === "string") {
            if (tag === before) {
                return [ true, after ];
            }
        }

    }

    return [ false, tag ];
}

(() => {
    const els = $("#upload_tag_string,#post_tag_string");
    if (els.length >= 1) {
        const check_cb = (e) => {
            const tags_field = $("#upload_tag_string,#post_tag_string");
            let tags = (tags_field.val() || "").split(/([\s\n])/).map(tag => tag.toLowerCase());

            let result = [];
            let correct_count = 0;
            let total_correct_count = 0;
            do {
                correct_count = 0;
                result = [];
                for (let tag of tags) {
                    if (/\S+/.test(tag)) {
                        /* Non-empty */

                        if (tag[0] === "-" || IGNORE_REGEX.test(tag)) {
                            result.push(tag);
                        } else {
                            const res = correct_tag(tag);
                            if (res[0]) {
                                correct_count += 1;
                            }

                            result.push(res[1]);
                        }
                    } else {
                        result.push(tag);
                    }
                }

                tags = result;
                total_correct_count += correct_count;
            } while (correct_count > 0);

            console.log("Corrected", total_correct_count, "tags");
            tags_field.val(tags.join("")).trigger("input");
        };

        $("#validate-tags").on("click", check_cb);
        $("#check-tags").on("click", check_cb);

        /* Put our function at the front */
        $._data($("#validate-tags")[0], "events").click.reverse();
        $._data($("#check-tags")[0], "events").click.reverse();
    }

})();
