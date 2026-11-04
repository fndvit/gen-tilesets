<!--
  The file's `responsive` rules: shape overrides by render-box width, cascading
  in order as CSS does, so a later rule wins. Not in Figma; built from the same
  primitives as Grid & Size.

  Drag the preview across a bound, or use its bound buttons, to see one take
  over. The preview is `<Tileset>` on this file (**S2**), so nothing about that
  is simulated.

  Rules change the shape, never the design: tiles and Operations are the same
  at every width. Bounds are the render box's width, inclusive. Under fluid
  sizing the density knob is `columns`; `cellSize` alone changes nothing
  visible.

  Every edit goes through `document.ts`, which refuses one that would leave the
  file illegal (**E5**): a `rows` over a stack with a `rect` in it, a `bleed`
  that leaves no box, a rule with no condition. Where the editor already knows
  an option would be refused, it is disabled and says why ("pinned"): while an
  Operation is coordinate-bound, no rule may change `rows` or `columns`.
-->
<script lang="ts">
  import type { Operation } from "@vit-foundation/gen-tilesets";
  import {
    addRule,
    addRuleField,
    moveRule,
    removeRule,
    removeRuleField,
    setRuleField,
  } from "../../document.js";
  import { RULE_FIELDS, RULE_PARSERS } from "../../fields.js";
  import { session } from "../../session.svelte.js";
  import NumericInput from "../NumericInput.svelte";
  import Section from "../Section.svelte";
  import AddBar from "../ui/AddBar.svelte";
  import Collapsible from "../ui/Collapsible.svelte";
  import IconButton from "../ui/IconButton.svelte";

  interface Props {
    /** The coordinate-bound Operations, which pin `rows` and `columns`. */
    risked: Operation[];
  }

  let { risked }: Props = $props();

  const rules = $derived(session.file.responsive ?? []);

  type RuleField = (typeof RULE_FIELDS)[number];

  /** `minWidth` → "min width": the field's name in words, for its label. */
  const words = (field: RuleField): string => field.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`);

  const pinned = (field: RuleField): boolean =>
    (field === "rows" || field === "columns") && risked.length > 0;
</script>

<Section title="Breakpoints" open={rules.length > 0}>
  <div class="rules">
    {#each rules as rule, i (i)}
      <Collapsible title="Rule {i + 1}" variant="group">
        {#snippet actions()}
          <IconButton icon="trash" label="Remove rule {i + 1}" onclick={() => session.apply(removeRule(i))} />
          <IconButton
            icon="up"
            label="Move rule {i + 1} earlier (a later rule wins)"
            disabled={i === 0}
            onclick={() => session.apply(moveRule(i, i - 1))}
          />
          <IconButton
            icon="down"
            label="Move rule {i + 1} later (a later rule wins)"
            disabled={i === rules.length - 1}
            onclick={() => session.apply(moveRule(i, i + 1))}
          />
        {/snippet}

        <div class="body">
          {#each RULE_FIELDS.filter((f) => rule[f] !== undefined) as field (field)}
            <div class="field">
              <div class="input">
                <NumericInput
                  label={words(field)}
                  value={rule[field]!}
                  parse={RULE_PARSERS[field]}
                  onCommit={(t) => session.apply(setRuleField(i, field, t))}
                />
              </div>
              <IconButton
                icon="trash"
                label="Inherit {words(field)} again"
                onclick={() => session.apply(removeRuleField(i, field))}
              />
            </div>
          {/each}

          <select
            class="add-field t-xs"
            aria-label="Add a field to rule {i + 1}"
            value=""
            onchange={(e) => {
              const field = e.currentTarget.value as RuleField;
              e.currentTarget.value = "";
              if (field) session.apply(addRuleField(i, field));
            }}
          >
            <option value="">+ Field</option>
            {#each RULE_FIELDS.filter((f) => rule[f] === undefined) as field (field)}
              <option value={field} disabled={pinned(field)}>
                {words(field)}{pinned(field) ? " (pinned)" : ""}
              </option>
            {/each}
          </select>
        </div>
      </Collapsible>
    {/each}

    <AddBar label="Add breakpoint" onclick={() => session.apply(addRule())} />
  </div>
</Section>

<style>
  .rules {
    display: grid;
    gap: var(--space-2);
  }

  /* The tile group body: paper, framed in ink. */
  .body {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-3);
    border: var(--rule);
    border-top: 0;
    background: var(--color-paper);
  }

  .field {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
    color: var(--color-ink);
  }

  .input {
    flex: 1;
    min-width: 0;
  }

  .add-field {
    justify-self: start;
    padding: var(--space-2);
    border: var(--rule);
    border-radius: var(--radius);
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-ui);
    cursor: pointer;
  }
</style>
