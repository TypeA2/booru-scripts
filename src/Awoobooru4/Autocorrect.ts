interface DictionaryEntry {
    type: "simple" | "regex";
    search: string;
    replace: string;
}

export const DEFAULT_REPLACEMENTS: DictionaryEntry[] = [
    { type: "regex", search: "(?<=.+[_|-])shrit", replace: "shirt" },
    { type: "regex", search: "(?<!t)-(?=shirt)", replace: "_" },

    { type: "regex", search: "(?<=.+[_|-])skrit", replace: "skirt" },
    { type: "regex", search: "(?<!half)-(?=skirt)", replace: "_" },

    { type: "regex", search: "(?<=.+[_|-])naisl", replace: "nails" },
    { type: "regex", search: "(?<=.+)-(?=nails)", replace: "_" },

    { type: "regex", search: "(?<=.+)-(?=sweater)", replace: "_" },
    
    { type: "regex", search: "(?<=.+[_|-])shrots", replace: "shorts" },
    { type: "regex", search: "(?<=.+)-(?=shorts)", replace: "_" },
    
    { type: "regex", search: "(?<=.+)-(?=eyes)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=hair)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=dress)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=jacket)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=ribbon)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=hat)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=necktie)", replace: "_" },
    { type: "regex", search: "(?<=(.+){2,})-(?=bow)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=brooch)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=belt)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=cardigan)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=corset)", replace: "_" },
    { type: "regex", search: "(?<=.+)-(?=coat)", replace: "_" },
    
    { type: "regex", search: "colalred(?=[_|-].+)", replace: "collared" },

    { type: "regex", search: "(?<=.+[_|-])haiar", replace: "hair" },
    { type: "regex", search: "(?<=.+[_|-])hairl", replace: "hair" },
    { type: "regex", search: "(?<=.+[_|-])eyesl", replace: "eyes" },
    { type: "regex", search: "(?<=.+[_|-])eys", replace: "eyes" },
    { type: "regex", search: "(?<=.+[_|-])flwoer", replace: "flower" },
    { type: "regex", search: "(?<=.+[_|-])choekr", replace: "choker" },
    { type: "regex", search: "(?<=.+[_|-])ribobn", replace: "ribbon" },
    { type: "regex", search: "blakc(?=[_|-].+)", replace: "black" },

    { type: "simple", search: "outdoros", replace: "outdoors" },
    { type: "simple", search: "colalred_shirt", replace: "collared_shirt" },
    { type: "simple", search: "earrinsg", replace: "earrings" },
    { type: "simple", search: "sweatdorp", replace: "sweatdrop" },
    { type: "simple", search: "tongue-out", replace: "tongue_out" },
    { type: "simple", search: "character-name", replace: "character_name" },
    { type: "simple", search: "thigh-strap", replace: "thigh_strap" },
    { type: "simple", search: "anger-vein", replace: "anger_vein" },
    { type: "simple", search: "bleu_eyes", replace: "blue_eyes" },
    { type: "simple", search: "hicket", replace: "hickey" },
    { type: "simple", search: "colared_shirt", replace: "collared_shirt" },
    { type: "simple", search: "lbush", replace: "blush" },
    { type: "simple", search: "cat_eras", replace: "cat_ears" },
    { type: "simple", search: "ponytial", replace: "ponytail" },
    { type: "simple", search: "sidelocsk", replace: "sidelocks" },
    { type: "simple", search: "film-grain", replace: "film_grain" },
    { type: "simple", search: "holding_phoen", replace: "holding_phone" },
];

export default abstract class Autocorrect {
    public static correct_tag(tag: string): [string, boolean] {
        for (const { type, search, replace } of DEFAULT_REPLACEMENTS) {
            switch (type) {
                case "simple": {
                    if (tag === search) {
                        return [ replace, true ];
                    }
                    break;
                }

                case "regex": {
                    const regex = new RegExp(search, "i");
                    if (regex.test(tag)) {
                        return [ tag.replace(regex, replace), true ];
                    }
                    break;
                }
            }
        }

        return [ tag, false ];
    }
}
