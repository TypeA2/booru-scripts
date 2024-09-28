/* Initial version: 2024-09-06
 * Current version: 2024-09-06
 */
javascript:void(async () => {
    let text = "";

    for (const e of document.querySelector("h2 + div > h1").childNodes) {
        console.log(e.nodeName)
        switch (e.nodeName) {
            case "A": {
                const linked = e.textContent.substring(1);
                text += `"#${linked}":[https://www.instagram.com/explore/tags/girlsbandcry/${linked}/]`;
                break;
            }
            case "BR":
                text += "\n";
                break;
            case "#text":
                text += e.textContent;

        }
    }

    navigator.clipboard.writeText(text);
})();
