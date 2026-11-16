import "solid-js";

declare module "solid-js" {
    namespace JSX {
        interface SvgSVGAttributes<T> {
            transform?: string;
        }
    }
}
