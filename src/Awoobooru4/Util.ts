import { JSXElement } from "solid-js";

export function* array_chunks<T>(arr: T[], n: number): Generator<T[]> {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}

/* Sometimes JSXElement is an array, but this gives expected behavior always */
export function notice(msg: string | HTMLElement | JSXElement) {
    Danbooru.notice($("<span>").append(msg as (HTMLElement | string)).html());
}

export function error(msg: string | HTMLElement | JSXElement) {
    Danbooru.error($("<span>").append(msg as (HTMLElement | string)).html());
}
