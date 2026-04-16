# Dashboards

Compose content from across your vault into a dashboard layout — charts, note embeds, stats, and link cards arranged in rows and columns, right inside a note.

![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D1.10.0-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **12-column grid** — rows of columns, Bootstrap-style widths, auto-stacks on mobile
- **Six widget types** — markdown, chart, embed, stat, link, heading
- **Chart integration** — inline or linked [Bases Chart](https://github.com/kevinmcaleer/obsidian-bases-chart) blocks
- **Read and edit modes** — clean reading view by default, pencil icon toggles inline editing
- **Drag-to-resize columns** — grab the divider between columns; width snaps to the 12-grid
- **Visual widget editor** — modal with type picker and per-widget fields, no YAML required
- **YAML code block** — layout stored as readable YAML in a `dashboard` code block

## Quick start

Drop a fenced code block with `dashboard` into any note:

````markdown
```dashboard
title: Project overview
rows:
  - height: 220
    columns:
      - width: 4
        widget:
          type: stat
          label: Active projects
          value: "12"
          trend: +3
      - width: 4
        widget:
          type: stat
          label: Completed this week
          value: "5"
          trend: +2
      - width: 4
        widget:
          type: stat
          label: Blocked
          value: "1"
          trend: -1
  - height: 360
    columns:
      - width: 6
        widget:
          type: chart
          chart:
            type: pie
            sql: SELECT COUNT(*) FROM "Projects.base" GROUP BY status
            title: Projects by status
      - width: 6
        widget:
          type: chart
          chart:
            type: bar
            sql: SELECT COUNT(*) FROM notes GROUP BY month(file.ctime) ORDER BY label asc
            title: Notes per month
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
- Click the **+** icon on an empty column to add a widget (opens the editor modal)
- Drag the divider between two columns to resize them, or use the slider
- Set row heights in pixels, or leave blank for content-driven height

There's also a command — **Dashboards: Insert layout** — that drops a starter template at the cursor.

## Working with charts

The **Chart** widget is the main reason this plugin exists. It has two modes:

### 1. Inline chart — define the chart right inside the dashboard

The `chart` field takes the same YAML that [Bases Chart](https://github.com/kevinmcaleer/obsidian-bases-chart) accepts. Everything — `type`, `sql`, `title`, `colors`, `dataLabels`, `height`, `fontSize`, `fontColor`, etc. — flows through verbatim.

```yaml
widget:
  type: chart
  chart:
    type: bar
    sql: SELECT COUNT(*) FROM "Todos.base" GROUP BY status
    title: Todos by status
    dataLabels: outside
    showGridlines: false
```

### 2. Linked chart — reference a chart that lives in another note

Point at a note that contains a `bases-chart` fenced block. The dashboard renders that chart in place. Useful when you want a single source of truth for a chart and reuse it across multiple dashboards.

```yaml
widget:
  type: chart
  source: "[[Charts/Project status]]"
```

### Stat tile: today's KPIs

The stat chart type is perfect for dashboard tiles — set `height` small and `fontSize` large for a clean KPI card:

```yaml
widget:
  type: chart
  chart:
    type: stat
    title: Notes created today
    sql: SELECT COUNT(*) WHERE day(file.ctime) = today() AS "Today" FROM notes
    fontSize: 96
    fontColor: "#4e79a7"
    height: 180
```

> **Requires** the Bases Chart plugin to be installed and enabled. The dashboard detects it automatically — charts render if it's present, and a helpful notice appears if it isn't.

## Widget types

### Markdown

Any markdown content — including wikilinks, embeds, tags, and fenced code blocks:

```yaml
widget:
  type: markdown
  content: |
    ### Today's tasks
    - [[Review PR]]
    - [[Write docs]]
    - #urgent Fix deploy pipeline
```

### Chart

Either inline (`chart:`) or linked (`source:`). See [Working with charts](#working-with-charts).

### Embed

Transclude another note or section using Obsidian's native `![[...]]` embed:

```yaml
widget:
  type: embed
  target: "[[Weekly summary]]"
```

You can embed a whole note, a heading (`[[Weekly summary#Highlights]]`), or a block (`[[Notes#^block-id]]`).

### Stat

Big-number KPI card with optional trend and icon — driven by the values you set (not a query). For SQL-driven stats, use the `chart` widget with `type: stat` instead.

```yaml
widget:
  type: stat
  label: Active projects
  value: "12"
  trend: +3
  icon: folder
```

### Link

Clickable card that opens the target note:

```yaml
widget:
  type: link
  target: "[[Reading list]]"
  description: My current reading queue
```

### Heading

Section divider — useful at the start of a row to label what's below:

```yaml
widget:
  type: heading
  text: This week
  level: 2
```

## Grid system

- 12-column layout, Bootstrap-style. `width: 6` means the column takes half the row.
- If `width` is omitted, columns auto-distribute evenly (`12 / N columns`).
- Row `height` is in pixels — omit for content-driven height.
- On mobile (≤768px), columns stack vertically.

## Examples

### Daily driver

One-row KPI strip on top, a two-column analytics row, a full-width activity calendar below.

````yaml
```dashboard
title: Daily driver
rows:
  - height: 160
    columns:
      - widget:
          type: chart
          chart:
            type: stat
            sql: SELECT COUNT(*) WHERE day(file.ctime) = today() AS "Today" FROM notes
            title: Created today
            fontSize: 72
      - widget:
          type: chart
          chart:
            type: stat
            sql: SELECT COUNT(*) WHERE file.mtime >= 1760000000000 AS "Recent" FROM notes
            title: Modified (24h)
            fontSize: 72
            fontColor: "#f28e2b"
      - widget:
          type: chart
          chart:
            type: stat
            sql: SELECT COUNT(*) AS "Notes" FROM notes
            title: Total notes
            fontSize: 72
            fontColor: "#59a14f"
  - height: 320
    columns:
      - width: 7
        widget:
          type: chart
          chart:
            type: bar
            sql: SELECT COUNT(*) FROM notes GROUP BY month(file.ctime) ORDER BY label asc
            title: Notes per month
            dataLabels: top
      - width: 5
        widget:
          type: chart
          chart:
            type: pie
            sql: SELECT COUNT(*) FROM "Todos.base" GROUP BY status
            title: Todos
  - columns:
      - widget:
          type: chart
          chart:
            type: calendar
            sql: SELECT COUNT(*) FROM notes
            title: Note activity
```
````

### Project status board

```yaml
title: Active projects
rows:
  - columns:
      - width: 4
        widget:
          type: link
          target: "[[Project Alpha]]"
          description: Shipping next week
      - width: 4
        widget:
          type: link
          target: "[[Project Beta]]"
          description: In review
      - width: 4
        widget:
          type: link
          target: "[[Project Gamma]]"
          description: Discovery phase
  - height: 280
    columns:
      - widget:
          type: embed
          target: "[[Sprint notes]]"
```

## Installation

### From Obsidian (once accepted to community plugins)

1. **Settings → Community plugins → Browse**
2. Search for **Dashboards**
3. **Install**, then **Enable**

Chart widgets require the [Bases Chart](https://github.com/kevinmcaleer/obsidian-bases-chart) plugin; install that too.

### From source

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/kevinmcaleer/obsidian-dashboards.git dashboards
cd dashboards
npm install
npm run build
```

Restart Obsidian, then enable **Dashboards** in Settings → Community plugins.

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/kevinmcaleer/obsidian-dashboards/releases), place them in `.obsidian/plugins/dashboards/`, restart Obsidian, and enable.

## Development

```bash
npm install
npm run dev     # watch build with source maps
npm run build   # production build
npm run lint    # eslint
npm run release # bump version, tag, push (triggers GitHub release workflow)
```

## Compatibility

- Obsidian **1.10.0+** (uses the Bases code-block API and Component lifecycle)
- Desktop and mobile (iOS/Android)
- Works alongside Bases, Dataview, Tasks, Canvas, and any markdown plugin

## License

MIT
