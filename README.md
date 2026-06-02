# Section Links
A tiny Figma plugin that copies shareable links to top-level sections on the current page.

## Details

### Usage
1. Copy the share URL for the current Figma file
2. Run Section Links
3. Paste the Figma share URL into the settings
4. Choose an output format and sort order
5. Copy the generated section links

### Behavior
1. Finds top-level sections on the current page
2. Ignores sections that start with configured prefixes
3. Generates external Figma links from the pasted share URL and each section node ID
4. Sorts output by layer order or alphabetically

### Settings
- Figma share URL is saved and used as the base for generated external links
- Output format can be Plain Text, Markdown, HTML, CSV, JSON, YAML, or TOML
- Sort order can be layer order or alphabetical, in either direction
- Ignored section prefixes can be customized with one prefix per line

### Limitations
- Only top-level sections on the current page are included
- A Figma share URL is required to generate external links
- Ignored section prefixes default to `.` and `_`

### Pricing
- This plugin is and will always be completely free

### Source code
- Available at <https://github.com/miguel-muniz/figma-section-links>

## Development

Install dependencies:

```sh
npm install
```

Build `code.ts` into the `code.js` file used by Figma:

```sh
npm run build
```

Lint the source:

```sh
npm run lint
```
