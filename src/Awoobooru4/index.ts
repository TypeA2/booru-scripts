import './meta.js?userscript-metadata';

import globalCss from './style.scss';

import Logger from './Logger';
import { Page, PageManager } from './PageManager';
import BetterTagBoxFeature from "./BetterTagBox";
import OneUpFeature from "./OneUp";
import PanzoomFeature from "./Panzoom";
import Feature from './Feature';
import UITweaks from './UITweaks';

const feature_mapping: { [key in Page]: (typeof Feature)[] } = {
    [Page.UploadSingle]: [ BetterTagBoxFeature, OneUpFeature, PanzoomFeature ],
    [Page.UploadMultiple]: [],
    [Page.ViewPost]: [ BetterTagBoxFeature, UITweaks ],
    [Page.ViewMediaAsset]: [ PanzoomFeature ],
    [Page.UserFeedbacks]: [ UITweaks ],
    [Page.ViewUser]: [ UITweaks ],
    [Page.ViewArtist]: [ UITweaks ]
} as const;

const logger = new Logger("Awoobooru3");

const features = feature_mapping[PageManager.current_page()];

if (features.length === 0) {
    logger.info(`No features for ${Page[PageManager.current_page()]}`);
} else {
    logger.info(`Initializing ${Page[PageManager.current_page()]} with ${features.length} feature${features.length === 1 ? "" : "s"}:`,
        features.map(f => f.name).join(", "));
}

const active_features = features.map(feature => new (feature as unknown as { new() })());

if (active_features.length > 0) {
    GM_addStyle(globalCss);
}
