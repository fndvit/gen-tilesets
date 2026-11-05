<!--
  The file's `responsive` rules: shape overrides by render-box width, cascading
  in order as CSS does, so a later rule wins. Not in Figma; built from the same
  primitives as Grid & Size. Each rule is a nested row (triangle, title, a
  summary while closed, reorder and remove in the row); the "+" that adds one
  is in the section's header.

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

  /** "max width" → "Max width": a label starts with a capital, the inherit name does not. */
  const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

  const pinned = (field: RuleField): boolean =>
    (field === "rows" || field === "columns") && risked.length > 0;
</script>

<Section
  title="Breakpoints"
  open={rules.length > 0}
  summary={rules.length === 0 ? "None" : `${rules.length} ${rules.length === 1 ? "rule" : "rules"}`}
>
  {#snippet actions(reveal)}
    <IconButton
      icon="plus"
      label="Add breakpoint"
      onclick={() => {
        session.apply(addRule());
        reveal();
      }}
    />
  {/snippet}

  {#if rules.length === 0}
    <p class="empty t-label">No rules: the grid is the same at every width.</p>
  {/if}

  <div class="rules">
    {#each rules as rule, i (i)}
      {@const set = RULE_FIELDS.filter((f) => rule[f] !== undefined)}
      <Collapsible
        title="Rule {i + 1}"
        variant="group"
        summary={set.map((f) => `${words(f)} ${rule[f]}`).join(" · ")}
      >
        {#snippet actions()}
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
          <IconButton icon="trash" label="Remove rule {i + 1}" onclick={() => session.apply(removeRule(i))} />
        {/snippet}

        <div class="body">
          {#each set as field (field)}
            <div class="field">
              <NumericInput
                label={capital(words(field))}
                value={rule[field]!}
                parse={RULE_PARSERS[field]}
                onCommit={(t) => session.apply(setRuleField(i, field, t))}
              />
              <IconButton
                icon="close"
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
  </div>
</Section>

<style>
  .rules {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
  }

  .empty {
    margin: var(--space-2) 0;
    color: var(--color-placeholder);
    line-height: var(--leading-hint);
    text-box: none;
  }

  /*
    A rule's fields, one indent in, under its title: two per row, each a boxed
    field with its "inherit again" cross beside it.
  */
  .body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
    padding: var(--space-1) 0 var(--space-4) var(--indent);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    color: var(--color-label);
  }

  .field > :global(.field) {
    flex: 1;
  }

  /* Looks like the add-variants row: a dashed place where a field can go. */
  .add-field {
    box-sizing: border-box;
    height: var(--control-h);
    padding: 0 var(--space-4);
    border: var(--rule-w) dashed var(--color-rule);
    border-radius: var(--radius);
    background: var(--color-paper);
    color: var(--color-label);
    font-family: var(--font-ui);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
  }

  .add-field:hover {
    border-style: solid;
    border-color: var(--color-rule-hover);
    background: var(--color-hover);
    color: var(--color-ink);
  }
</style>
