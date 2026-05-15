# Pitfalls & Quirks

## lib/graph.ts — duplicate vault filenames [HYPOTHESIS]

If two vault files share the same basename (e.g. `01_Projects/React.md` and `03_Knowledge/React.md`),
`buildGraphData` resolves `[[React]]` to whichever file was processed last. Obsidian resolves
by proximity; this implementation does not. Low risk for most vaults, but worth noting.
