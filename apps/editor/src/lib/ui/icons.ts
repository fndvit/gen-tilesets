/**
 * The editor's icon set, as path data copied from the Figma file
 * (`VCp0HyxbLOBq0vOkpDWmIL`, page *Editor*).
 *
 * Paths are kept rather than the exported `.svg` files because an icon has to
 * take its colour from the text around it: white on a bar, ink on paper, seed
 * magenta on re-seed. `Icon.svelte` draws every entry with `currentColor`, so
 * no icon carries a colour of its own.
 *
 * Coordinates are in the icon's Figma frame (`w` × `h`). Strokes that Figma
 * lets overflow the frame (the 2px chevron, the trash outline) overflow here
 * too: `Icon.svelte` sets `overflow: visible`.
 */

export interface IconDef {
  /** Native size in px. Icons are drawn at this size and never scaled. */
  w: number;
  h: number;
  d: string;
  mode: "stroke" | "fill";
  /** Stroke width in px; `stroke` icons only. */
  strokeWidth?: number;
  /** Round caps and joins; Figma draws the trash outline this way. */
  round?: boolean;
  /** Top-left of the frame in path coordinates, when the path is not drawn from 0,0. */
  origin?: readonly [number, number];
}

export const ICONS = {
  /** Section and group disclosure. Points down; `Collapsible` turns it up when open. */
  fold: { w: 12, h: 6, d: "M0 0L6 6L12 0", mode: "stroke", strokeWidth: 2 },
  /** Move an operation up / down. */
  up: { w: 12, h: 6, d: "M6 0L0 6H12Z", mode: "fill" },
  down: { w: 12, h: 6, d: "M6 6L0 0H12Z", mode: "fill" },
  /** Add bars. */
  plus: { w: 18, h: 18, d: "M9 0V18M18 9H0", mode: "stroke", strokeWidth: 1 },
  /** Delete. */
  trash: {
    w: 12,
    h: 12,
    // Figma's export is 13×13 with a 0.5px margin; `origin` puts it back on the 12px frame.
    origin: [0.5, 0.5],
    d:
      "M1.7 2.9H2.9M1.7 2.9L2.648 11.432C2.6805 11.7256 2.82016 11.9969 3.04025 12.194" +
      "C3.26034 12.3911 3.54538 12.5 3.8408 12.5H9.1592" +
      "C9.45462 12.5 9.73966 12.3911 9.95975 12.194" +
      "C10.1798 11.9969 10.3195 11.7256 10.352 11.432L11.3 2.9M1.7 2.9H0.5M2.9 2.9H10.1" +
      "M2.9 2.9L3.707 1.1882C3.80405 0.982381 3.95762 0.808398 4.1498 0.686547" +
      "C4.34198 0.564695 4.56485 0.499997 4.7924 0.5H8.2076" +
      "C8.43526 0.499884 8.65825 0.564528 8.85054 0.686386" +
      "C9.04284 0.808244 9.19651 0.982288 9.2936 1.1882L10.1 2.9M10.1 2.9H11.3M11.3 2.9" +
      "H12.5M5.3 5.9V8.9M7.7 5.9V8.9",
    mode: "stroke",
    strokeWidth: 1,
    round: true,
  },
  /** Re-seed. Always drawn in `--color-seed` by its caller (`IconButton tone="seed"`). */
  reseed: {
    w: 12,
    h: 10,
    d:
      "M11.8352 7.29976C12.0549 7.50898 12.0549 7.84817 11.8352 8.05737L9.96024 9.84273" +
      "C9.60845 10.1778 8.99999 9.94295 8.99999 9.46391V8.57143H7.62222C7.58365 8.57143 " +
      "7.54549 8.56388 7.51012 8.54924C7.47475 8.5346 7.44291 8.51319 7.4166 8.48634L5.76294 " +
      "6.79893L7.01294 5.52342L8.24999 6.78572H8.99999V5.89328C8.99999 5.41476 9.60803 " +
      "5.17904 9.96024 5.51447L11.8352 7.29976ZM0.28125 3.21429H2.25L3.48705 4.47659L4.73704 " +
      "3.20107L3.08339 1.51366C3.05707 1.48681 3.02524 1.4654 2.98986 1.45076C2.95449 1.43612 " +
      "2.91634 1.42857 2.87777 1.42857H0.28125C0.12593 1.42857 0 1.5485 0 1.69643V2.94643" +
      "C0 3.09435 0.12593 3.21429 0.28125 3.21429ZM8.99999 3.21429V4.10679C8.99999 4.5858 " +
      "9.60845 4.82063 9.96024 4.4856L11.8352 2.70025C12.0549 2.49103 12.0549 2.15183 " +
      "11.8352 1.94263L9.96024 0.157343C9.60803 -0.178104 8.99999 0.0576328 8.99999 " +
      "0.536138V1.42857H7.62222C7.58365 1.42857 7.54549 1.43612 7.51012 1.45076C7.47475 " +
      "1.4654 7.44291 1.48681 7.4166 1.51366L2.25 6.78572H0.28125C0.12593 6.78572 0 6.90565 " +
      "0 7.05357V8.30357C0 8.4515 0.12593 8.57143 0.28125 8.57143H2.87777C2.95572 8.57143 " +
      "3.03018 8.54061 3.08339 8.48634L8.24999 3.21429H8.99999Z",
    mode: "fill",
  },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
