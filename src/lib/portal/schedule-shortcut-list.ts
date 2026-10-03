/* The Schedule's keyboard shortcuts, as its `?` list names them (issue #351) and Help's Keyboard
   card repeats them (issue #358). One list, so the two never disagree. Browser-safe. */

export interface Shortcut {
  readonly keys: readonly string[];
  readonly does: string;
  /** Help's Keyboard card shows the shortcuts that carry its shorter wording. */
  readonly help?: string;
}

export interface ShortcutGroup {
  readonly title: string;
  readonly shortcuts: readonly Shortcut[];
}

export const SCHEDULE_SHORTCUTS: readonly ShortcutGroup[] = [
  {
    title: "In the day",
    shortcuts: [
      { keys: ["↑", "↓"], does: "Earlier or later for this provider" },
      { keys: ["←", "→"], does: "Same time, next provider" },
      { keys: ["Return"], does: "Open the appointment or book the time" },
      { keys: ["Esc"], does: "Close what is open" },
    ],
  },
  {
    title: "Days and views",
    shortcuts: [
      { keys: ["T"], does: "Today", help: "Jump to today" },
      { keys: ["J", "K"], does: "Next or previous day, week or month" },
      { keys: ["D", "W", "M"], does: "Day, week or month", help: "Day, week, month" },
    ],
  },
  {
    title: "Anywhere",
    shortcuts: [
      { keys: ["/"], does: "Search patients", help: "Find a patient" },
      { keys: ["Tab"], does: "Next area: toolbar, day, sidebar" },
      { keys: ["?"], does: "This list" },
    ],
  },
];

/** The shortcuts Help's Keyboard card lists, in the order it lists them. */
export const HELP_SHORTCUTS: readonly (Shortcut & { readonly help: string })[] = [
  "Find a patient",
  "Jump to today",
  "Day, week, month",
].flatMap((help) =>
  SCHEDULE_SHORTCUTS.flatMap((group) =>
    group.shortcuts.flatMap((shortcut) => (shortcut.help === help ? [{ ...shortcut, help }] : [])),
  ),
);

/** The spoken name of a key, where its glyph says nothing to a screen reader. */
export const SPOKEN_KEYS: ReadonlyMap<string, string> = new Map([
  ["↑", "Up arrow"],
  ["↓", "Down arrow"],
  ["←", "Left arrow"],
  ["→", "Right arrow"],
  ["/", "Slash"],
  ["?", "Question mark"],
]);

/** The keys of a shortcut as a screen reader should say them. */
export function spokenKeys(keys: readonly string[]): string {
  return keys.map((key) => SPOKEN_KEYS.get(key) ?? key).join(", ");
}
