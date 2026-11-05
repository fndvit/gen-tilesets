<!--
  The editor's `lib/ui` primitives, rendered alone. One story for all of them:
  each docs page passes `show` and gets only its own demo.

  It loads the editor's tokens and text styles (`tokens.css`, `type.css`) but
  not `base.css`, so the editor's global focus ring and reduced-motion rule do
  not leak into the docs site. Every demo holds its own state and prints what
  the component hands back.
-->
<script lang="ts">
  import "../../../editor/src/styles/tokens.css";
  import "../../../editor/src/styles/type.css";
  import AddBar from "../../../editor/src/lib/ui/AddBar.svelte";
  import Button from "../../../editor/src/lib/ui/Button.svelte";
  import Collapsible from "../../../editor/src/lib/ui/Collapsible.svelte";
  import FieldRow from "../../../editor/src/lib/ui/FieldRow.svelte";
  import Hint from "../../../editor/src/lib/ui/Hint.svelte";
  import GlyphGrid from "../../../editor/src/lib/ui/GlyphGrid.svelte";
  import Icon from "../../../editor/src/lib/ui/Icon.svelte";
  import InlineEdit from "../../../editor/src/lib/ui/InlineEdit.svelte";
  import IconButton from "../../../editor/src/lib/ui/IconButton.svelte";
  import Marquee from "../../../editor/src/lib/ui/Marquee.svelte";
  import OperationGlyph from "../../../editor/src/lib/ui/OperationGlyph.svelte";
  import Popup from "../../../editor/src/lib/ui/Popup.svelte";
  import Slider from "../../../editor/src/lib/ui/Slider.svelte";
  import TabBar from "../../../editor/src/lib/ui/TabBar.svelte";
  import Toggle from "../../../editor/src/lib/ui/Toggle.svelte";
  import { ICONS, type IconName } from "../../../editor/src/lib/ui/icons.js";
  import all from "../../../editor/src/assets/glyphs/selection/all.svg?url";
  import checkered from "../../../editor/src/assets/glyphs/selection/checkered.svg?url";
  import everyNth from "../../../editor/src/assets/glyphs/selection/every-nth.svg?url";
  import handpick from "../../../editor/src/assets/glyphs/selection/handpick.svg?url";
  import random from "../../../editor/src/assets/glyphs/selection/random.svg?url";
  import rect from "../../../editor/src/assets/glyphs/selection/rect.svg?url";

  type Show =
    | "icon"
    | "icon-button"
    | "add-bar"
    | "button"
    | "popup"
    | "collapsible"
    | "inline-edit"
    | "field-row"
    | "toggle"
    | "slider"
    | "marquee"
    | "tab-bar"
    | "operation-glyph"
    | "glyph-grid"
    | "hint";

  let { show }: { show: Show } = $props();

  let log = $state("—");

  const names = Object.keys(ICONS) as IconName[];

  let open = $state(true);
  let popupOpen = $state(false);
  let groupName = $state("Tile group B");
  let alignment = $state<"column" | "gutter">("column");
  let weight = $state(1);
  let live = $state(1);
  let summary = $state("Checkerbox * opacity [0.5 - 1] * random source * set");
  const steps = [
    { id: "selection", label: "Selection" },
    { id: "attribute", label: "Attribute" },
    { id: "source", label: "Source" },
    { id: "blend", label: "Blend" },
  ];
  let step = $state<string | null>(null);
  let glyph = $state<string>("everyNth");
  const selection = [
    { value: "all", label: "All", src: all },
    { value: "checkered", label: "Checkered", src: checkered },
    { value: "everyNth", label: "Every Nth", src: everyNth },
    { value: "random", label: "Random", src: random },
    { value: "rect", label: "Rect", src: rect },
    { value: "handpick", label: "Handpick", src: handpick },
  ];
  let attribute = $state<string>("opacity");
  const attributes = [
    { value: "tileId", label: "Tile" },
    { value: "opacity", label: "Opacity" },
    { value: "rotation", label: "Rotation" },
  ];

  /** What the demo reports: the last click, or the state a stateful demo holds. */
  const readout = $derived.by(() => {
    switch (show) {
      case "collapsible":
        return `open: ${open} · last: ${log}`;
      case "popup":
        return `open: ${popupOpen} · last: ${log}`;
      case "inline-edit":
        return `value: ${groupName}`;
      case "toggle":
        return `value: ${alignment}`;
      case "tab-bar":
        return `selected: ${step ?? "none"}`;
      case "glyph-grid":
        return `selection: ${glyph}, attribute: ${attribute}`;
      default:
        return log;
    }
  });
</script>

<div class="not-content story">
  {#if show === "icon"}
    <div class="row">
      {#each names as name (name)}
        <figure>
          <span class="swatch"><Icon {name} /></span>
          <figcaption class="t-console">{name}</figcaption>
        </figure>
      {/each}
    </div>
  {:else if show === "icon-button"}
    <div class="bar on-bar">
      <IconButton icon="trash" label="Delete operation" onclick={() => (log = "delete")} />
      <IconButton icon="reseed" label="Re-seed" tone="seed" onclick={() => (log = "reseed")} />
      <IconButton icon="up" label="Move up" onclick={() => (log = "up")} />
      <IconButton icon="down" label="Move down" disabled onclick={() => (log = "down")} />
    </div>
  {:else if show === "add-bar"}
    <div class="stack">
      <AddBar label="Add tile group" onclick={() => (log = "bar")} />
      <AddBar label="Add tile" variant="square" onclick={() => (log = "square")} />
    </div>
  {:else if show === "button"}
    <div class="row">
      <Button label="Undo" onclick={() => (log = "undo")} />
      <Button label="Import" disabled onclick={() => (log = "import")} />
    </div>
    <div class="stack">
      <Button label="Download tileset.zip" wide onclick={() => (log = "download")} />
    </div>
    <div class="row theme-inverted inverted">
      <Button label="Undo" onclick={() => (log = "undo (inverted)")} />
      <Button label="New" onclick={() => (log = "new (inverted)")} />
    </div>
  {:else if show === "popup"}
    <div class="row">
      <Button label="Open the popup" onclick={() => (popupOpen = true)} />
    </div>
    <Popup title="Import refused" bind:open={popupOpen} onClose={() => (log = "closed")}>
      <p class="t-body">Not opened. Nothing in the current document has changed.</p>
    </Popup>
  {:else if show === "collapsible"}
    <div class="stack">
      <Collapsible title="Grid & Size" bind:open>
        <p class="t-body pad">Section body. The caller owns its padding.</p>
      </Collapsible>
      <Collapsible
        title={groupName}
        variant="group"
        open={false}
        onRename={(name) => {
          groupName = name;
          log = `renamed: ${name}`;
        }}
      >
        {#snippet actions()}
          <IconButton icon="trash" label="Delete {groupName}" onclick={() => (log = "delete group")} />
        {/snippet}
        {#snippet extras()}
          <span class="thumb"></span><span class="thumb"></span><span class="thumb"></span>
        {/snippet}
        <p class="t-body pad">Group body.</p>
      </Collapsible>
    </div>
  {:else if show === "inline-edit"}
    <div class="bar on-bar">
      <InlineEdit value={groupName} label="Rename tile group" onCommit={(v) => (groupName = v)} />
    </div>
  {:else if show === "field-row"}
    <div class="stack">
      <FieldRow label="Cell size" for="story-cell">
        <input id="story-cell" class="t-label underline" value="54" />
      </FieldRow>
      <FieldRow
        label="Y offset"
        hint="Shifts the grid up by a fraction of a cell, from 0 to just under 1. The top of row 0 is clipped."
        for="story-y"
      >
        {#snippet children(describedBy)}
          <input id="story-y" class="t-label underline" value="0" aria-describedby={describedBy} />
        {/snippet}
      </FieldRow>
    </div>
  {:else if show === "toggle"}
    <FieldRow label="Alignment" align="center">
      <Toggle
        label="Alignment"
        options={[
          { value: "column", label: "Column" },
          { value: "gutter", label: "Gutter" },
        ]}
        value={alignment}
        onChange={(v) => (alignment = v)}
      />
    </FieldRow>
  {:else if show === "slider"}
    <div class="asset">
      <span class="thumb lg"></span>
      <Slider
        label="Weight"
        min={0}
        max={2}
        step={0.01}
        value={weight}
        onInput={(v) => (live = v)}
        onCommit={(v) => {
          weight = v;
          log = `commit: ${v}`;
        }}
      />
      <span class="t-label pct">{Math.round((live / 2) * 100)}%</span>
    </div>
  {:else if show === "marquee"}
    <div class="stack narrow">
      <Marquee text="Short summary" />
      <Marquee text={summary} />
      <Marquee text={summary} scroll="hover" />
      <label class="t-console">Text <input bind:value={summary} /></label>
    </div>
  {:else if show === "tab-bar"}
    <div class="stack">
      <div class="tabs-box"><TabBar label="Steps" tabs={steps} active={null} onSelect={(id) => (step = id)} /></div>
      <div class="tabs-box"><TabBar label="Steps" tabs={steps} active={step ?? "selection"} onSelect={(id) => (step = id)} /></div>
    </div>
  {:else if show === "operation-glyph"}
    <div class="row paper" role="radiogroup" aria-label="Examples">
      <OperationGlyph label="Every Nth" src={everyNth} onclick={() => (log = "every nth")} />
      <OperationGlyph label="Handpick" src={handpick} selected onclick={() => (log = "handpick")} />
      <OperationGlyph label="Opacity" onclick={() => (log = "opacity")} />
    </div>
  {:else if show === "hint"}
    <Hint text="Hover text appears at once, under what it explains, and takes no room in the layout.">
      {#snippet children(id)}
        <span class="t-label" aria-describedby={id}>Hover me</span>
      {/snippet}
    </Hint>
  {:else if show === "glyph-grid"}
    <div class="stack paper">
      <p class="t-body">Which cells does this operation affect?</p>
      <GlyphGrid label="Selection" items={selection} value={glyph} onChange={(v) => (glyph = v)} />
      <p class="t-body">Label-only cells, until their glyphs are designed:</p>
      <GlyphGrid label="Attribute" items={attributes} value={attribute} onChange={(v) => (attribute = v)} />
    </div>
  {/if}
  <pre>{readout}</pre>
</div>

<style>
  .story {
    padding: var(--space-6);
    background: var(--color-ground);
    color: var(--color-ink);
    font-family: var(--font-ui);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    align-items: flex-start;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Sidebar-ish width, so the long summary overflows and scrolls. */
  .narrow {
    max-width: 320px;
  }

  .paper {
    padding: var(--space-3);
    background: var(--color-paper);
  }

  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .swatch,
  .bar {
    display: flex;
    gap: var(--space-5);
    align-items: center;
    padding: var(--space-2);
    background: var(--color-ink);
    color: var(--color-paper);
  }

  .pad {
    padding: var(--space-3);
    background: var(--color-paper);
  }

  .thumb {
    display: block;
    width: var(--thumb-sm);
    height: var(--thumb-sm);
    background: var(--color-inactive);
  }

  .thumb.lg {
    width: var(--thumb);
    height: var(--thumb);
  }

  .asset {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    background: var(--color-paper);
  }

  .pct {
    width: 46px;
    text-align: right;
  }

  .underline {
    width: 8em;
    border: 0;
    border-bottom: var(--rule);
    background: transparent;
    text-align: right;
  }

  .tabs-box {
    height: var(--bar-h-group);
  }

  pre {
    margin: var(--space-6) 0 0;
    font-size: 0.75rem;
  }

  /* The footer's look: a black block in `.theme-inverted`. */
  .inverted {
    padding: var(--space-4);
    background: var(--color-paper);
  }
</style>
