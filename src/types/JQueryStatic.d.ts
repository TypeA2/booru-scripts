import type { JSX } from "solid-js";

declare global {
  interface JQueryStatic {
    (element: JSX.Element): JQuery<HTMLElement>;
  }
}
