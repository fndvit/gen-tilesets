<!--
  `<Tileset>` — `08-renderer-svelte.md` §3-§6, as a wrapper.

  **The renderer is `TilesetRenderer` (`./renderer.ts`); this adapts it to
  Svelte** (0.9.0). It mounts the renderer in an effect, hands it every prop
  change, exposes its box, and destroys it on teardown. Everything S1, S2, S3 and
  S7 say of `<Tileset>` they now say of the renderer, and its header carries
  them. What is left here is what only a Svelte host has: props, `bind:box`,
  deeply reactive options, a server render, and the props that moved in 0.6.0.
-->
<script lang="ts">
  import { untrack } from "svelte";
  // The bundler puts this in `<head>`, server-rendered pages included, so a
  // Svelte host's first paint is already styled. The renderer's `injectStyles`
  // finds it there and adds nothing; it adds the rules only where this copy
  // cannot reach, such as a shadow root or an iframe (`./styles.ts`).
  import "./tileset.css";
  import { DEV } from "../dev.js";
  import type { TilesetFile } from "../types.js";
  import { copyOptions, legacyPropErrors, optionErrors, type TilesetOptions } from "./options.js";
  import Placeholder from "./Placeholder.svelte";
  import { placeholder } from "./placeholder.js";
  import { TilesetRenderer } from "./renderer.js";

  interface Props {
    /** Parsed, valid, and held stable by the host (**S3**). */
    file: TilesetFile;

    /**
     * Every setting, in one object — `TilesetOptions` in `./options.ts` documents
     * each field and its default, and `resolveOptions` is the only place a
     * default is written. `undefined` is accepted as well as absence so a
     * wrapper can forward its own optional `options` straight through.
     */
    options?: TilesetOptions | undefined;

    /**
     * The render box element — `08` §7, bindable and read-only in practice:
     * `TilesetRenderer.box`, whose comment says what it is for and why it is the
     * box and not the canvas. Not in `options` because Svelte cannot `bind:`
     * into a field of an object prop.
     *
     * `null` until the renderer mounts — after the first render, before the
     * first paint and so before any pointer event — and again after teardown.
     * Between the two it is one element, across a substrate switch included.
     */
    box?: HTMLElement | null;
  }

  // There is no width prop: `07` §5.3 makes every quantity a fixed fraction of
  // Wpx, so placement is expressed in relative units and Wpx is whatever width
  // the host's CSS gives the element.
  //
  // There is no `config` prop and no `layout` prop: splitting the file across two
  // would hand the host a way to pair mismatched halves (§3.1). That is also why
  // the settings object is called `options` — `file.config` already has the name.
  //
  // `rest` exists only to catch the props that moved into `options` in 0.6.0.
  // Svelte drops an unknown prop silently, which here would mean a host's seed or
  // provider vanishing into a plausible picture.
  let { file, options, box = $bindable(null), ...rest }: Props = $props();

  /** SSR-stable, so the server's reservation CSS and the client's agree. */
  const id = $props.id();

  let host: HTMLDivElement;
  let renderer: TilesetRenderer | null = null;
  /** Whether the renderer has mounted, which retires the placeholder. */
  let mounted = $state(false);
  /** The first update after mounting repeats the constructor's inputs; skipped. */
  let fresh = false;

  /**
   * Development only. The props that moved into `options` are a Svelte
   * question, so they are asked here; the options are asked beside them so one
   * throw reports everything wrong with the props at once, worded for this
   * component. The renderer asks the options again, for a host with no
   * component, and finds nothing left to say.
   */
  function checkProps(o: TilesetOptions | undefined): void {
    if (!DEV) return;
    const errors = [...legacyPropErrors(rest), ...optionErrors(o)];
    if (errors.length > 0) {
      throw new Error("`<Tileset>`'s props are not valid:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    }
  }

  // Built once per mount, untracked: read here, `file` and `options` would make
  // this effect rebuild the renderer on every prop change.
  $effect(() => {
    const r = untrack(() => {
      checkProps(copyOptions(options));
      return new TilesetRenderer(host, { id, file, options });
    });
    renderer = r;
    fresh = true;
    box = r.box;
    mounted = true;
    return () => {
      r.destroy();
      renderer = null;
      box = null;
    };
  });

  // **Every prop change is one `update()`.** An inline `options={{…}}` makes a
  // new object per parent render, so this runs per parent render, and that is
  // harmless: the model's per-field memos stop an unchanged copy (**R12**).
  //
  // The dependencies are read **explicitly**, here: `copyOptions` reads every
  // field a host could edit in place, so `opts.seed = "b"` on a `$state` object
  // is a change (it says why). The `update()` itself is untracked — its
  // development checks walk the whole file, and tracked they would make this
  // effect depend on every field of a `$state` file in development only, so the
  // two builds would re-run it on different edits.
  $effect(() => {
    const f = file;
    const o = copyOptions(options);
    checkProps(o);
    if (fresh) {
      fresh = false;
      return;
    }
    untrack(() => renderer?.update({ file: f, options: o }));
  });

  /** Read only while not mounted: on the server, and for the first client render. */
  const reserved = $derived(mounted ? null : placeholder(id, file, options));
</script>

<!--
  **The host the renderer appends into, and it has no box of its own.**
  `display: contents` makes its children lay out as the parent's, so the render
  box's `width: 100%` resolves against the page's element exactly as it did when
  the box was this component's root, and a flex or grid parent sees the box as
  its item. Inline rather than in `tileset.css`, so no host stylesheet order can
  undo it. Rejected: a plain block host — in a shrink-to-fit parent its width
  comes from content whose width is a percentage of it, so it collapses, a layout
  change for every flex and grid host.

  `data-tileset-wrapper` marks it as the package's, so `options.avoid`'s
  selectors resolve in the page's element around it rather than in here, where
  the only thing to find is the box (`measure.ts`'s `scopeOf`).

  **The placeholder is for the server** (`./placeholder.ts`). No effect runs
  there, so without it a server-rendered page would ship an empty host and jump
  when the renderer mounted. It reserves exactly what the renderer's box reserves
  before measuring, and the mount effect retires it in the same task the renderer
  appears in, before any paint. Rendered on the client too until then, because
  hydration needs the markup the server sent.
-->
<div bind:this={host} data-tileset-host="" data-tileset-wrapper="" style="display: contents">
  {#if reserved !== null}
    <Placeholder p={reserved} />
  {/if}
</div>
