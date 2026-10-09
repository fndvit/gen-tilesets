<!--
  The editor's `BlendControl` for each Target. The options it offers come from
  `acceptedBlends(target)`; `tileId` accepts only `set`, so it shows no choice.
-->
<script lang="ts">
  import { TARGETS, type BlendName, type TargetName } from "@fndvit/gen-tilesets";
  import BlendControl from "../../../editor/src/controls/BlendControl.svelte";

  const targets = Object.keys(TARGETS) as TargetName[];
  let target = $state<TargetName>("rotation");
  let blend = $state<BlendName>("set");
</script>

<div class="not-content">
  <label class="pick">
    target
    <select bind:value={target} onchange={() => (blend = "set")}>
      {#each targets as t (t)}<option>{t}</option>{/each}
    </select>
  </label>
  <BlendControl {target} {blend} onChange={(b) => (blend = b)} />
  <pre>blend = {JSON.stringify(blend)}</pre>
</div>

<style>
  .pick { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; }
  pre { font-size: 0.75rem; }
</style>
