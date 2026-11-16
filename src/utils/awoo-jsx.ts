import { VChild, VElementNode, VNode } from "@gera2ld/jsx-dom";
import { JSX } from "solid-js/jsx-runtime";

export function mount(vnode: VChild | JSX.Element): HTMLElement {
    if ((vnode as VNode)?.vtype === 1) {
        const { type, props } = vnode as VElementNode;

        if (type === "template") {
            /* Special handling for template so children are handled correctly */
            const child = props.children;
            props.children = undefined;

            const mounted = VM.hm("template", props, null) as HTMLElement;
            mounted.innerHTML = (child as HTMLElement).outerHTML;

            return mounted;
        }
    }

    return VM.mountDom(vnode as VChild) as HTMLElement;
}
