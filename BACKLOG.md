# Backlog

Every item has a permanent ID (`B-001`, `B-002`…) that batches cite (see `docs/Batch-workflow.md`).
IDs are never renumbered or reused, even after an item is done or dropped; a new item takes the
highest ID ever used + 1. A finished item moves to **Done** as one line, e.g.
`- **B-003** Grid button → On/off switch: batch-01 T-01, PR #NN`. A dropped item goes there too,
with `dropped: <reason>`.

- **B-001** Re-order sections: Currently the sidebar sections are arbitrarily ordered. It does make sense to have the Grid & size section as first, but ‘Breakpoints’ after it feels a bit weird, as it is not used that much. The order should be follow a logical principle. Also, the Derived section only contains static informationm which might be better to put somewhere else;
- **B-002** Sticky section headers: make the section headers sticky, so that a long unfolded operations section (for example), can still be folded when the user has scrolled past the current header position.

- **B-003** Grid button: make it display an ‘On/off’ switch button instead of the single Grid button, as it would be more explicit for the user;
- **B-004** In the blank space that there is between the sections and the fixed header, I want to include a subtle tileset as a decoration motif. It shouldn’t be the whole sidebar background, but be contained inside a div that varies its size according to the vertical white space there is between the last section and the fixed footer. It will contain a checkered selection of a single color tiles. The color must match the overall color scheme. Create one for now and I will tweak it later;
- **B-005** Operations should have a unique color/index to be able to follow them on the stack more easily, even after re-organizing them;
- **B-006** The relation between the ‘Grid and Size’ and ‘Breakpoints’ section is confusing even for me. We should re-think how do these 2 work, the user must understand better what creating a breakpoint mean and what it implies. This needs to be clearer. For example, some attributes on breakpoints like ‘cellSize’ seem to not affect the preview at all. Why is there a “Columns” field in breakpoints but not in Grid & Size? Once a breakpoint is created, it should be clear which view are we seeing at all times. This might mean reworking how the breakpoints sections is presented;
- **B-007** When adding a pattern to an operation, the user might want to re-use it for another one. I.e: the same noise function applied to a scale operation might be wanted for the rotation in another one. Allow different operations to use the same pattern as others;
- **B-008** Currently we have Offset X & Y separated. Same with Scale. Instead, group them as a single attribute (Offset, Scale), and add X & Y as parameters inside the same attribute, so the user can choose to affect both at the same time, or just one of them;
- **B-009** The ‘EveryNth’ selection does not work how I imagine it. For me ‘everyNth’ means that every N cells, a cell is selected, and changing a row does not reset that count. The current behaviour acts more as a ‘Row’ or ‘Column’ selection, which is fine to have, but with another name. This means: change the behaviour of everyNth so it works like it should, and create another selection for ‘Row/Column’;
- **B-010** Bug: In an operation where we configure a constant tileId in a cell, after another operation that configures rotation, it looks like rotation affects the tileId even if the tileId operation comes after. TLDR: a rotation operation affects operations that go after it;
- **B-011** The ‘Rect’ selection option should allow the user to use a drag over the tileset to select the cells;
- **B-012** There should be an option to ‘Hide/Unhide’ operations so the user does not need to delete them;
- **B-013** Bug: I have been able to scroll past the editor

- **B-014** This warning has 2 problems: A -> painted cells outside the grid that had been handpicked do not appear, thus cannot be ‘taken out’. There should be a way to do that. B -> this warning appeared after importing a file, so I cannot ‘Undo’
- **B-015** Having a tileset consisting of a single random operation, that does not re-roll on load, but tile groups do have multiple assets, we are saying that it does not make sense to preview a fresh load. That means that we don’t have the option to “Reroll assets on fresh load”?

## Additions

- **B-016** We want to create a set of ‘Example tiles’ and ‘Example tilesets’ (find a better word than ‘example’), so the user can use the tool right away without having to create tiles from the beginning. This should be implemented in a way that makes the user experience logical, which might include changing how the current ‘add tiles’ functionality works;
- **B-017** We need to create a brief Onboarding explaining the steps to create a Tileset. It should include: how to configure the tileset dimension, how to add tiles, how to add operations, how to randomize (a brief step for every section). The user must be able to opt-out at any time, and the onboarding must make use of the typical UI that points to the places where the user must look at every step;
- **B-018** Operations should show a (i) button or popover to show the ‘how do the operations and operation stack works’. It should be clear but not very long;
- **B-019** The randomness section should also have an (i) popover or button to explain how randomness works in the tileset. A new user will not understand the randomness hierarchy there is right now right away;

- **B-020** When opening new content on the sidebar, we should automatically scroll it up if that content gets under the fixed foote;

- **B-021** Reroll operation button without having to open it.

## Done

(none yet)
