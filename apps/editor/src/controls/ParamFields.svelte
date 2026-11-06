<!--
  Every control for one registered type, built from its `ParamSchema` alone —
  `09-editor.md` §7.1, **E9**.

  **There is no code here that knows what `everyNth` or `valueNoise` is.** That
  is the whole point: `05` §3.1 promises that a new Source is "a source file, a
  table entry, a commit", and a mapping with holes would make it two changes
  wearing one name.
-->
<script lang="ts">
  import type { ParamSchema } from "@vit-foundation/gen-tilesets";
  import { affordanceFor } from "./affordance.js";
  import FieldRow from "../lib/ui/FieldRow.svelte";
  import ParamControl from "./ParamControl.svelte";

  interface Props {
    schema: ParamSchema;
    /** The draft's current parameters, keyed by name. */
    values: Record<string, unknown>;
    onChange: (name: string, value: unknown) => void;
    /**
     * What each param does, by name, for its label's hint. Passed in rather
     * than looked up here, so this file still knows no registered type.
     */
    hints?: Readonly<Record<string, string>>;
  }

  let { schema, values, onChange, hints = {} }: Props = $props();

  const entries = $derived(Object.entries(schema));
</script>

<!-- A type with no parameters shows nothing: the step's glyph already says it all. -->
{#if entries.length > 0}
  <div class="params">
    {#each entries as [name, spec] (name)}
      {@const affordance = affordanceFor(spec)}
      {#if affordance.kind === "cellList"}
        <!--
          §7.3 — "`cellList` is painted, not generated". The author paints cells
          on the preview; pointer events convert to render space and then through
          `cellAt`, which the editor never reimplements (`07` §8.2, `08` **S10**).
          The surface is `PaintLayer.svelte`, over the preview. Here it is a count.
        -->
        <FieldRow
          label="Cells"
          hint="Paint on the preview. Drag to continue a stroke; start on a painted cell to erase."
        >
          {#snippet children()}
            <span class="t-value">{Array.isArray(values[name]) ? (values[name] as unknown[]).length : 0}</span>
          {/snippet}
        </FieldRow>
      {:else}
        <ParamControl
          {name}
          {spec}
          {affordance}
          about={hints[name]}
          value={values[name]}
          onChange={(v) => onChange(name, v)}
        />
      {/if}
    {/each}
  </div>
{/if}

<style>
  /* One column that never grows past the body (the implicit `auto` column would). */
  .params {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }
</style>
