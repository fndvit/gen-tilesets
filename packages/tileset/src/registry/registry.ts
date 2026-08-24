/**
 * The registry — `05-extension-model.md` §5.
 *
 * A registered type is an entry in a table, keyed by the name a config uses to
 * refer to it. There is **no public registration API**: `05` §3 assumes one
 * engine, developed in this repository and consumed by pinning a version, so a
 * new Source is added the way any other code is — a source file, an entry in a
 * table, a commit, a release.
 */

/** `06` §7.4. Data rather than a validator function: three consumers read it, one runs it. */
export type ParamSpec =
  | { type: "number"; min?: number; max?: number; exclusiveMin?: number; exclusiveMax?: number; default?: number }
  | { type: "integer"; min?: number; max?: number; default?: number }
  | { type: "enum"; values: (string | number)[]; default?: string | number }
  | { type: "cellList" };

export type ParamSchema = Record<string, ParamSpec>;

export interface Registration<Impl> {
  /** What appears in a config. Unique within its kind (`05` **X4**). */
  name: string;
  params: ParamSchema;
  impl: Impl;
}

/**
 * Names are unique **within a kind**, not globally. `random` is deliberately both
 * a Selection and a Source (`04` §4.2, §5.2); they are namespaced by slot and
 * take different parameters. `CONVENTIONS.md` §10.3 records this collision as tolerated.
 */
export class Registry<Entry extends { name: string }> {
  readonly #entries = new Map<string, Entry>();

  constructor(readonly kind: "selection" | "source" | "blend") {}

  /**
   * **Invariant X4** — registering into an occupied name is an error, never a
   * silent overwrite.
   *
   * Silent overwrite would make load order semantically load-bearing — the
   * failure `02` §6.1 rejected for iteration order and `03` **D1** rejected for
   * identifiers derived from list position. An implementation detail nobody is
   * looking at would decide what the config means.
   */
  register(entry: Entry): void {
    if (this.#entries.has(entry.name)) {
      throw new Error(
        `${this.kind} "${entry.name}" is already registered. ` +
          `05 X4: registering into an occupied name is an error, never a silent overwrite.`,
      );
    }
    this.#entries.set(entry.name, entry);
  }

  /**
   * **Invariant X7** — a config naming a type the engine does not have is a load
   * failure. The engine never substitutes a default and never skips the
   * Operation.
   *
   * Graceful degradation loses badly: a fallback renders a plausible-looking
   * wrong picture with no error anywhere, which is worse than both a blank page
   * and a stack trace.
   *
   * In a validated config this is unreachable — `06` §10.3 raises
   * `UNKNOWN_TYPE_NAME` at load, and that is the whole of X7's enforcement,
   * because the engine never sees such a config at all. This throw is the
   * undefined-behaviour edge `06` **C5** describes.
   */
  get(name: string): Entry {
    const entry = this.#entries.get(name);
    if (entry === undefined) {
      throw new Error(`Unknown ${this.kind} type "${name}" (05 X7). Registered: ${this.names().join(", ")}`);
    }
    return entry;
  }

  has(name: string): boolean {
    return this.#entries.has(name);
  }

  names(): string[] {
    return [...this.#entries.keys()];
  }

  all(): Entry[] {
    return [...this.#entries.values()];
  }
}
