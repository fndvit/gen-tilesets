# Batch 03, session A

## T-01 Collage: remove the operation that does nothing
Done. `op1` removed; generated grids identical before and after (default seed and two others, load salts 0, 1, 7, 12345). Tour step 6 checked in the browser: it opens and cuts out `op6` and reads "operation 3" / "operations 1 and 2".

## T-02 More gallery tiles and a second template
Done. Images and Shapes tabs, 57 Shapes files, Mosaic in New tileset. Checked in the browser (port 5184, a Playwright probe in the session scratchpad): tabs by mouse and keyboard (one Tab stop, arrows/Home/End choose, Tab enters the grid), picks from both tabs added in pick order, opening the gallery fetches no full pictures, no horizontal overflow at 320, 400 and 1440 px, Mosaic opens with no notice, first visit still opens Collage.
One small deviation, in the change entry: the grids' scroller got a fixed height so the centred popup doesn't move the tabs when switching.
