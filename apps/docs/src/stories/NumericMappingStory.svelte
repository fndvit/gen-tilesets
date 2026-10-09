<!--
  The editor's `NumericMapping` for each numeric attribute. Its track comes from
  the attribute's own bounds (`trackFor`), and `collapsed` is what the editor
  passes under a `constant` Source.
-->
<script lang="ts">
  import { ATTRIBUTES, type AttributeName, type NumericMapping as Mapping } from "@fndvit/gen-tilesets";
  import NumericMapping from "../../../editor/src/controls/NumericMapping.svelte";

  const attrs = Object.keys(ATTRIBUTES) as AttributeName[];
  let target = $state<AttributeName>("rotation");
  let collapsed = $state(false);
  let mapping = $state<Mapping>({ range: [0, 270], steps: 4 });
</script>

<div class="not-content">
  <div class="pick">
    <label>
      target
      <select bind:value={target}>{#each attrs as a (a)}<option>{a}</option>{/each}</select>
    </label>
    <label><input type="checkbox" bind:checked={collapsed} /> collapsed</label>
  </div>
  <NumericMapping {target} {mapping} {collapsed} onChange={(m) => (mapping = m)} />
  <pre>mapping = {JSON.stringify(mapping)}</pre>
</div>

<style>
  .pick { display: flex; gap: 1rem; font-size: 0.875rem; margin-bottom: 0.5rem; }
  pre { font-size: 0.75rem; }
</style>
