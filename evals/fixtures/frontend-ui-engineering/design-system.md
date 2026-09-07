# Menu component conventions

- Framework: React with TypeScript.
- Styling: existing `menu-*` utility classes; do not add a styling dependency.
- Public components accept `className` and forward a DOM ref.
- Components must support keyboard-only and screen-reader users.
- Focus returns to the trigger when a menu closes.
- Escape closes the menu; arrow keys move between enabled items.

The new dropdown should expose a trigger label and an array of actions. Disabled
actions remain visible but cannot receive focus or execute.
