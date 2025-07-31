import '@violentmonkey/types';

import { DomNode } from "@gera2ld/jsx-dom";

declare global {
    namespace JSX {
        type Element = HTMLElement;
    }

    declare namespace VM {
        export * from "@gera2ld/jsx-dom";
    }
}
