import { mount } from "svelte";
import App from "./App.svelte";
// Tokens first: base.css and every component read them.
import "./styles/tokens.css";
import "./styles/base.css";

mount(App, { target: document.getElementById("app")! });
