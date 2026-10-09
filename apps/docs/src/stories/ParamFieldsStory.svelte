<!--
  The editor's `ParamFields` over a real registered schema. The form is built
  entirely from the registry's `ParamSchema`, through `affordanceFor`, so
  picking another Selection or Source changes the controls with no code here.
-->
<script lang="ts">
  import { selections, sources } from "@fndvit/gen-tilesets";
  import ParamFields from "../../../editor/src/controls/ParamFields.svelte";

  const options = [
    ...selections.names().map((n) => ({ key: `selection:${n}`, schema: selections.get(n).params })),
    ...sources.names().map((n) => ({ key: `source:${n}`, schema: sources.get(n).params })),
  ];
  let key = $state("selection:everyNth");
  let values = $state<Record<string, unknown>>({});
  const schema = $derived(options.find((o) => o.key === key)!.schema);
</script>

<div class="not-content">
  <label class="pick">
    schema
    <select bind:value={key} onchange={() => (values = {})}>
      {#each options as o (o.key)}<option value={o.key}>{o.key}</option>{/each}
    </select>
  </label>
  <ParamFields {schema} {values} onChange={(name, value) => (values = { ...values, [name]: value })} />
  <pre>schema = {JSON.stringify(schema)}
values = {JSON.stringify(values)}</pre>
</div>

<style>
  .pick { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; }
  pre { font-size: 0.75rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
