import { VChild, VElementNode, VNode } from "@gera2ld/jsx-dom";

export function mount(vnode: VChild): Node {
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

    return VM.mountDom(vnode);
}

export function awoo_jsx_hm(...args: Parameters<typeof VM.h>) {
    return mount(VM.h(...args));
}
