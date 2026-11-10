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

  **The fields that shape the grid commit on blur** (`rows`, `columns`,
  `cellSize`; Pol, Stage 2 W5), like Grid & size: typing "14" would otherwise
  build a 1-row grid first. The others (`minWidth`, `maxWidth`, `bleed`,
  `yOffset`) follow the typing, as Y offset does in Grid & size.
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

  /** "max width" → "Max width": a label in sentence case. */
  const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

  /** A closed rule's header: its fields and values, in one line. */
  const ruleSummary = (rule: (typeof rules)[number]): string =>
    RULE_FIELDS.filter((f) => rule[f] !== undefined)
      .map((f) => `${words(f)} ${rule[f]}`)
      .join(" · ");

  const summary = $derived(
    rules.length === 0 ? "None" : `${rules.length} ${rules.length === 1 ? "rule" : "rules"}`,
  );

  /** Fields committed once, on blur or Enter, rather than on every keystroke. */
  const GRID_SHAPING: ReadonlySet<RuleField> = new Set(["rows", "columns", "cellSize"]);

  const pinned = (field: RuleField): boolean =>
    (field === "rows" || field === "columns") && risked.length > 0;
</script>

<Section
  title="Breakpoints"
  tourHeading="breakpoints"
  open={rules.length > 0}
  {summary}
  addLabel="Add breakpoint"
  onAdd={() => session.apply(addRule())}
>
  <div class="rules">
    {#each rules as rule, i (i)}
      <Collapsible title="Rule {i + 1}" variant="group" summary={ruleSummary(rule)}>
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
                  label={sentence(words(field))}
                  value={rule[field]!}
                  parse={RULE_PARSERS[field]}
                  commit={GRID_SHAPING.has(field) ? "blur" : "parse"}
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
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  /* Inside the rule's well: the fields line up with the title above them. */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2) var(--space-5) var(--space-5);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-ink);
  }

  .input {
    flex: 1;
    min-width: 0;
  }

  /* A secondary button that opens a menu. */
  .add-field {
    justify-self: start;
    min-height: var(--control-h);
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--color-secondary);
    color: var(--color-ink);
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease);
  }

  .add-field:hover {
    background: var(--color-secondary-hover);
  }

  .add-field:active {
    background: var(--color-secondary-pressed);
  }
</style>
