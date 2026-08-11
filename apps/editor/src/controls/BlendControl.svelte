<!--
  The Blend control — `09-editor.md` §7.7, `04` §7.2, ADR-001.

  §7.7 fixes the presentation in one sentence: "for any Target, show the default
  Blend, and reveal the accepted set only on request." So the resting state is a
  readout of one word, and the alternatives are a disclosure.

  ## Two rules that are the whole component

  1. **The accepted set is computed, never listed.** Every Blend accepting the
     Target's type, less the Target's vetoes — `acceptedBlends()`, from the
     package. ADR-001's point is that a Blend registered later is available on
     every numeric Target at once, and §7.7 names the failure exactly: "an editor
     holding its own table would be the thing that failed to notice."

  2. **`tileId` gets no control at all** (`04` §7.2). Its type accepts `set` and
     nothing else, and §7.7: "a control with one option is a control that teaches
     the author nothing." Not a disabled control, not a single-button group —
     absent, with a sentence saying why. This is derived too: the branch asks
     whether the accepted set has one member, so a hypothetical second tile Blend
     would open the control rather than needing this file edited.
-->
<script lang="ts">
  import { acceptedBlends, TARGETS, type BlendName, type TargetName } from "@tileset/core";

  interface Props {
    target: TargetName;
    blend: BlendName;
    onChange: (blend: BlendName) => void;
  }

  let { target, blend, onChange }: Props = $props();

  const accepted = $derived(acceptedBlends(target));
  const fallback = $derived(TARGETS[target].default);

  /** §7.7's "only on request". Closed on open, and stays where the author put it. */
  let revealed = $state(false);
</script>

{#if accepted.length <= 1}
  <!--
    `04` §7.2 — no Blend but `set` accepts the tile type, "and the editor shows
    no blend control for `tileId` at all".
  -->
  <p class="only">
    <code>{fallback}</code> — the only Blend the
    <strong>{TARGETS[target].type}</strong> type accepts (<code>04</code>&nbsp;§7.2). A palette
    entry replaces what is under it; there is nothing to add it to.
  </p>
{:else}
  <div class="blend">
    <div class="row">
      <span class="current"><code>{blend}</code></span>
      {#if blend === fallback}
        <span class="hint">the default for <code>{target}</code></span>
      {:else}
        <button class="reset" onclick={() => onChange(fallback)}>
          back to <code>{fallback}</code>
        </button>
      {/if}
      <button class="disclose" aria-expanded={revealed} onclick={() => (revealed = !revealed)}>
        {revealed ? "hide" : "other blends"}
      </button>
    </div>

    {#if revealed}
      <!--
        Every Blend accepting this Target's type, less its vetoes. A vetoed Blend
        is not shown disabled: `04` §7.2 vetoes `multiply` on `rotation` "rather
        than leaving it as a trap", and a greyed-out button is the trap with a
        tooltip.
      -->
      <div class="set">
        {#each accepted as name (name)}
          <button class:on={blend === name} onclick={() => onChange(name)}>
            {name}
            {#if name === fallback}<em>default</em>{/if}
          </button>
        {/each}
      </div>

      <p class="note">
        <!-- `04` §7.1 -->
        <code>subtract</code> and <code>divide</code> are absent because the mapping expresses
        both — <code>add</code> over <code>[−5, −5]</code> subtracts five.
      </p>
    {/if}
  </div>
{/if}

<style>
  .blend {
    display: grid;
    gap: 0.4rem;
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .current {
    font-size: 0.85rem;
    color: #1a202c;
  }

  .hint {
    flex: 1;
    font-size: 0.68rem;
    color: #a0aec0;
  }

  .reset {
    flex: 1;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0;
    font: inherit;
    font-size: 0.68rem;
    color: #a0aec0;
    cursor: pointer;
  }

  .reset:hover {
    color: #4a5568;
  }

  .disclose {
    background: transparent;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    color: #5a6b80;
    padding: 0.15rem 0.4rem;
    font: inherit;
    font-size: 0.68rem;
    cursor: pointer;
  }

  .disclose:hover {
    color: #4a5568;
    border-color: #a0aec0;
  }

  .set {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .set button {
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    color: #4a5568;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .set button.on {
    background: #cbd5e0;
    color: #1a202c;
    border-color: #a0aec0;
  }

  .set em {
    font-style: normal;
    font-size: 0.62rem;
    color: #a0aec0;
    margin-left: 0.3rem;
  }

  .only,
  .note {
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.5;
    color: #a0aec0;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    color: #2b6cb0;
  }
</style>
