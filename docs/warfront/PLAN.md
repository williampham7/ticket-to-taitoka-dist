# Warfront: build plan (resume from the first unchecked item)

- [x] Rules engine, map geometry, cards, missions, view filter, bots, `WarfrontGame` (shared)
- [x] Tests: rules, bots (fair view, Hard > Medium > Easy), Local() no-leak incl. reconnect, 500-game fuzz
- [x] Server: register `WarfrontGame`; server bots for online rooms (`packages/server/src/warfrontBots.ts`)
- [x] Client shell: `/warfront` routes, picker card, party follow, music bus hook
- [x] Board: SVG war table (relief, acetate overlays, miniatures, lanes, plaques, pan/zoom)
- [x] Play UI: phase switches, deploy drafting with undo, attack and dice tray, occupy and fortify dials, cards, log, hints, shortcuts
- [x] Modes: vs Computer, pass and play (curtain), online waiting room (6 seats, colours, bots, rematch), watch
- [x] Menu (general's desk) and Field Manual
- [x] Result screen (newspaper, medals, stats, share chart)
- [x] Sound and music, animation setting (Full/Fast/Off)
- [x] e2e `e2e/warfront.spec.ts`; full typecheck, test and e2e; CLAUDE.md section
