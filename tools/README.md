# tools/convert-formulas.js
Converts raw formula text from DATA (index.html) into KaTeX ROWS segments.
Inputs: /tmp/data.json (extracted DATA), katex package extracted at /tmp/package.
Outputs: rows.json (splice into the const ROWS = line of index.html and public/index.html), report.txt, flags.txt.
