import Feature from "./Feature";
import Logger from "./Logger";
import Options from "./Options";

import css from "./Panzoom.scss";

import { type PanZoom } from "panzoom";

/* Based on hdk5's panzoom */

const logger = new Logger("Panzoom");

export default class PanzoomFeature extends Feature {
    public constructor() {
        super("panzoom");

        Options.register_feature("panzoom", this);
    }

    private _component: JQuery<HTMLDivElement>;
    private _container: JQuery<HTMLDivElement>;
    private _image: JQuery<HTMLImageElement>;
    private _zoom_level: JQuery<HTMLDivElement>;
    private _panzoom = $(<div class="media-asset-panzoom"/> as HTMLDivElement);
    private _panzoom_instance: PanZoom;

    private _fit(): void {
        this._panzoom_instance.zoomAbs(0, 0, 1);
        this._panzoom_instance.moveTo(0, 0);
    }

    private _update_zoom(): void {
        this._zoom_level.removeClass("hidden")
            .text(`${Math.round(100 * this._zoom_level_value())}%`);

        // Rendering without smoothing makes checking for artifacts easier
        this._container.css("image-rendering", this._zoom_level_value() > 1 ? "pixelated" : "auto");
    }

    private _zoom_level_value(): number {
        return (this._image.width() * this._panzoom_instance.getTransform().scale) / parseFloat(this._image.attr("width"));
    }

    public enable(): void {
        logger.info("Enabling");
        GM_addStyle(css);

        const initializer = () => {
            this._component = $(".media-asset-component");
            this._container = this._component.find(".media-asset-container");
            this._image = this._component.find(".media-asset-image");
            this._zoom_level = this._component.find(".media-asset-zoom-level");

            this._component.removeClass("media-asset-component-fit-height");

            this._panzoom.insertBefore(this._image);
            this._image.detach().appendTo(this._panzoom);
            this._image.off();

            this._panzoom_instance = panzoom(this._panzoom[0]);
            this._fit();
            this._zoom_level.on("click", _ => this._fit());

            this._update_zoom();
            this._panzoom_instance.on("zoom", _ => this._update_zoom());

            new ResizeObserver(_ => this._update_zoom()).observe(this._image[0]);
        };

        $(initializer);
    }

    public disable(): void {
        logger.info("Disabling");
    }
};
