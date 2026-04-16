# Dashboards

Compose content from across your vault into a dashboard layout — with charts, note embeds, stats, and link cards arranged in rows and columns.

![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D1.10.0-blueviolet)

## Features

- **Rows & columns grid** — 12-column responsive layout, wraps on mobile
- **Six widget types** — markdown, chart, embed, stat, link, heading
- **Chart integration** — works seamlessly with the [Bases Chart](https://github.com/kevinmcaleer/obsidian-bases-chart) plugin to embed SQL-driven charts
- **Read and edit modes** — clean reading view by default, pencil icon toggles inline editing
- **YAML code block** — dashboard layout is stored as readable YAML in a `dashboard` code block
- **Visual widget editor** — modal with type picker and fields for each widget

## Quick Start

Add a fenced code block with `dashboard`:

````markdown
```dashboard
title: Project overview
rows:
  - height: 300
    columns:
      - width: 6
        widget:
          type: chart
          chart:
            type: pie
            sql: SELECT COUNT(*) FROM "Projects.base" GROUP BY status
      - width: 6
        widget:
          type: stat
          label: Active projects
          value: "12"
          trend: +3
  - columns:
      - width: 12
        widget:
          type: embed
          target: "[[Weekly summary]]"
```
````

Click the **pencil icon** in the top-right to switch to edit mode. You can then:

- Click **+ Add row** below the grid
- Click **+ Column** on any row's toolbar
- Click the **+ icon** on an empty column to add a widget (opens the editor modal)
- Adjust column widths with the slider (1–12 grid units)
- Set row heights in pixels, or leave blank for auto

## Widget Types

### Markdown

Any markdown content — including wikilinks, embeds, and code blocks:

```yaml
widget:
  type: markdown
  content: |
    ### Today's tasks
    - [[Review PR]]
    - [[Write docs]]
```

### Chart (inline)

A bases-chart config embedded directly:

```yaml
widget:
  type: chart
  chart:
    type: bar
    sql: SELECT COUNT(*) FROM "Todos.base" GROUP BY status
    dataLabels: outside
```

### Chart (linked)

Reference a bases-chart block in another note:

```yaml
widget:
  type: chart
  source: "[[Charts/Project status]]"
```

### Embed

Transclude another note or section using Obsidian's native embed:

```yaml
widget:
  type: embed
  target: "[[Weekly summary]]"
```

### Stat

Big-number KPI card with optional trend:

```yaml
widget:
  type: stat
  label: Active projects
  value: "12"
  trend: +3
  icon: folder
```

### Link

Link card that opens the target note:

```yaml
widget:
  type: link
  target: "[[Reading list]]"
  description: My current reading queue
```

### Heading

A section divider:

```yaml
widget:
  type: heading
  text: This week
  level: 2
```

## Grid System

- 12-column layout (Bootstrap-style). `width: 6` means the column takes half the row.
- If `width` is omitted, columns auto-distribute evenly (`12 / N columns`).
- Row `height` is in pixels. Omit for content-driven height.
- On mobile (≤768px), columns stack vertically.

## Installation

### From Obsidian (once accepted to community plugins)

1. **Settings → Community plugins → Browse**
2. Search for **Dashboards**
3. **Install**, then **Enable**

### From source

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/YOUR_USERNAME/obsidian-dashboards.git dashboards
cd dashboards
npm install
npm run build
```

Restart Obsidian and enable the plugin in Settings → Community plugins.

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/YOUR_USERNAME/obsidian-dashboards/releases), place them in `.obsidian/plugins/dashboards/`, restart Obsidian, and enable.

## Development

```bash
npm install
npm run dev     # one-shot build with source maps
npm run build   # production build (minified)
npm run lint    # run eslint
npm run release # bump version, tag, and push (triggers GitHub release)
```

## License

MIT
