<!--
  `activeRules`, `activeKey` and `ruleOverride` at a width you choose, and the
  same rules handed to `<Tileset>` as `options.responsive` in a box that wide.
  The rules are the cascade example from `responsive.ts`'s module comment.
-->
<script lang="ts">
  import {
    activeKey,
    activeRules,
    bandWidths,
    loadTilesetFile,
    ruleOverride,
    type ResponsiveRule,
  } from "@fndvit/gen-tilesets";
  import { prefixedProvider } from "@fndvit/gen-tilesets/render";
  import Tileset from "@fndvit/gen-tilesets/Tileset.svelte";
  import raw from "../fixtures/basic.json";

  const file = loadTilesetFile(raw, "fixtures/basic.json");
  const provider = prefixedProvider(import.meta.env.BASE_URL);

  const rules: ResponsiveRule[] = [
    { maxWidth: 900, columns: 15 },
    { maxWidth: 500, columns: 9, rows: 14 },
  ];

  let width = $state(700);
  const active = $derived(activeRules(rules, width));
  const key = $derived(activeKey(rules, width));
  const override = $derived(ruleOverride(active));
  const options = { seed: "opal-ridge-80", provider, responsive: rules };
</script>

<div class="not-content">
  <div class="controls">
    <label>width {width}px <input type="range" min="200" max="1200" step="10" bind:value={width} /></label>
  </div>

  <table>
    <tbody>
      <tr><th>rules</th><td><code>{JSON.stringify(rules)}</code></td></tr>
      <tr><th>bandWidths</th><td><code>{JSON.stringify(bandWidths(rules))}</code></td></tr>
      <tr><th>activeKey</th><td><code>{JSON.stringify(key)}</code>{key === "" ? " (none: the base shape)" : ""}</td></tr>
      <tr><th>ruleOverride</th><td><code>{JSON.stringify(override)}</code></td></tr>
    </tbody>
  </table>

  <div class="scroller">
    <div class="stage" style:width="{width}px"><Tileset {file} {options} /></div>
  </div>
</div>

<style>
  .controls { font-size: 0.875rem; }
  .controls input { width: min(24rem, 100%); }
  table { font-size: 0.8rem; }
  th { white-space: nowrap; }
  td code { overflow-wrap: anywhere; }
  .scroller { overflow-x: auto; }
  .stage { outline: 1px dashed var(--sl-color-gray-4); }
</style>
