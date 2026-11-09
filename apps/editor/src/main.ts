import { mount } from "svelte";
import App from "./App.svelte";
import { keeping } from "./keeping.svelte.js";
// Tokens first: base.css and every component read them.
import "./styles/tokens.css";
import "./styles/base.css";

// The tileset kept from the last visit is reopened before the editor mounts,
// so the empty skeleton never shows and never reaches undo (`keeping.svelte.ts`).
// A promise rather than a top-level await, so the build target need not support one.
void keeping.restore().then(() => mount(App, { target: document.getElementById("app")! }));
