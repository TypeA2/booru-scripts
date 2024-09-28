/* Initial version: 2024-08-26
 * Current version: 2024-09-15 (rev: 3)
 * 
 * Changelog:
 *   Rev 1: fixed Twitter, Pixiv, add misskey
 *   Rev 2: firefox detection, fix bluesky
 *   Rev 3: fix Bluesky, limited Youtube support
 */
javascript:void(async () => {
    var profile_url;
    var secondary_url;
    try {
        switch (location.host) {
            case "twitter.com":
            case "x.com":
                profile_url = "https://twitter.com/" + location.pathname.split("/")[1];
                secondary_url = "https://twitter.com/intent/user?user_id=" + document.querySelector("[data-testid=placementTracking] button[data-testid$='follow'], aside button[data-testid$='follow']").dataset.testid.split("-")[0];
                break;
            case "www.pixiv.net":
                profile_url = (location.pathname.indexOf("users") > 0)
                    ? location.toString().replace("en/", "")
                    : "https://" + location.host + "/users/" + document.querySelector("a[href*='/users/']").dataset.gtmValue;
                secondary_url = await fetch(profile_url.replace("en/", "").replace("users", "stacc/id")).then(r => r.url);
                break;
            case "bsky.app":
                const handle = document.querySelector("a[href^='/profile/'").href.substring(location.origin.length + "/profile/".length).split("/")[0];
                profile_url = "https://bsky.app/profile/" + handle;

                const noscript = new DOMParser().parseFromString(document.querySelector("noscript").innerText, "text/html");
                const did = noscript.getElementById("bsky_did");
                if (did) {
                    secondary_url = "https://bsky.app/profile/" + did.innerText;
                } else {
                    secondary_url = "https://bsky.app/profile/" + await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`).then(r => r.json()).then(j => j.did);
                }
                break;
            case "misskey.io":
                profile_url = "https://misskey.io/@" + document.querySelector("meta[name='misskey:user-username']").content;
                secondary_url = "https://misskey.io/users/" + document.querySelector("meta[name='misskey:user-id']").content;
                break;
            case "www.youtube.com":
                const yt_profile = document.querySelector("link[rel='alternate'][media='handheld']");
                const yt_id = document.querySelector("link[rel='canonical']");
                if (yt_profile?.href.endsWith("youtube.com/") || yt_id?.href.endsWith("youtube.com/")) {
                    alert("Please reload the channel page");
                    return;
                }

                if (yt_profile.href.includes("watch?v=")) {
                    alert("Please open the channel page");
                    return;
                }

                profile_url = yt_profile.href.replace("m.", "www.");
                secondary_url = yt_id.href;
                break;
            default:
                alert(`Unsupported site: ${location.host}`);
                return;
        }
    } catch (err) {
        alert(`Error: ${err}`);
        return;
    }
    navigator.userAgent.toLowerCase().includes("firefox")
        ? alert (profile_url + "\n" + secondary_url)
        : prompt(location.host + " URLs", profile_url + "\n" + secondary_url);
})();
