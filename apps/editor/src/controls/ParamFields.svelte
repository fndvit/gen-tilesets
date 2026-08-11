<!--
  Every control for one registered type, built from its `ParamSchema` alone —
  `09-editor.md` §7.1, **E9**.

  **There is no code here that knows what `everyNth` or `valueNoise` is.** That
  is the whole point: `05` §3.1 promises that a new Source is "a source file, a
  table entry, a commit", and a mapping with holes would make it two changes
  wearing one name.
-->
<script lang="ts">
  import type { ParamSchema } from "@tileset/core";
  import { affordanceFor } from "./affordance.js";
  import ParamControl from "./ParamControl.svelte";

  interface Props {
    schema: ParamSchema;
    /** The draft's current parameters, keyed by name. */
    values: Record<string, unknown>;
    onChange: (name: string, value: unknown) => void;
  }

  let { schema, values, onChange }: Props = $props();

  const entries = $derived(Object.entries(schema));
</script>

{#if entries.length === 0}
  <p class="none">No parameters.</p>
{:else}
  <div class="params">
    {#each entries as [name, spec] (name)}
      {@const affordance = affordanceFor(spec)}
      {#if affordance.kind === "cellList"}
        <!--
          §7.3 — "`cellList` is painted, not generated". The author paints cells
          on the preview; pointer events convert to render space and then through
          `cellAt`, which the editor never reimplements (`07` §8.2, `08` **S10**).
          The surface is `PaintLayer.svelte`, over the preview.
        -->
        <p class="painted">
          <strong>{name}</strong> is painted on the preview, not typed (§7.3).
          {#if Array.isArray(values[name])}
            <em>{(values[name] as unknown[]).length} cells</em>
          {/if}
        </p>
      {:else}
        <ParamControl
          {name}
          {spec}
          {affordance}
          value={values[name]}
          onChange={(v) => onChange(name, v)}
        />
      {/if}
    {/each}
  </div>
{/if}

<style>
  .params {
    display: grid;
    gap: 0.45rem;
  }

  .none,
  .painted {
    margin: 0;
    font-size: 0.75rem;
    color: #a0aec0;
  }

  .painted strong {
    color: #4a5568;
    font-weight: 500;
  }

  .painted em {
    font-style: normal;
    color: #5a6b80;
  }
</style>
