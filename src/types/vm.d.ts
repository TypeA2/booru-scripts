import "@violentmonkey/types";

import { DomNode } from "@gera2ld/jsx-dom";

declare global {
    declare namespace VM {
        export * from "@gera2ld/jsx-dom";
    }
}
