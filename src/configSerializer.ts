import { parseYaml, stringifyYaml } from 'obsidian';
import { DashboardConfig, Row, Column, Widget, WidgetType } from './types';

const VALID_WIDGET_TYPES: WidgetType[] = ['markdown', 'chart', 'embed', 'stat', 'link', 'heading'];

/**
 * Parse YAML from a ```dashboard code block.
 * Returns null if the YAML is malformed.
 */
export function parseDashboard(source: string): DashboardConfig | null {
  try {
    const raw = parseYaml(source) as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return { rows: [] };

    const config: DashboardConfig = { rows: [] };

    if (typeof raw.title === 'string') config.title = raw.title;

    if (Array.isArray(raw.rows)) {
      config.rows = raw.rows.map(parseRow).filter((r): r is Row => r !== null);
    }

    return config;
  } catch {
    return null;
  }
}

function parseRow(raw: unknown): Row | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const row: Row = { columns: [] };
  if (typeof r.height === 'number') row.height = r.height;

  if (Array.isArray(r.columns)) {
    row.columns = r.columns.map(parseColumn).filter((c): c is Column => c !== null);
  }

  return row;
}

function parseColumn(raw: unknown): Column | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;

  const column: Column = {};
  if (typeof c.width === 'number') column.width = Math.max(1, Math.min(12, c.width));

  if (c.widget && typeof c.widget === 'object') {
    const widget = parseWidget(c.widget);
    if (widget) column.widget = widget;
  }

  return column;
}

function parseWidget(raw: unknown): Widget | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  const type = w.type;
  if (typeof type !== 'string' || !VALID_WIDGET_TYPES.includes(type as WidgetType)) return null;

  switch (type) {
    case 'markdown':
      return { type: 'markdown', content: typeof w.content === 'string' ? w.content : '' };
    case 'chart': {
      const widget: Widget = { type: 'chart' };
      if (w.chart && typeof w.chart === 'object') {
        (widget as { chart?: Record<string, unknown> }).chart = w.chart as Record<string, unknown>;
      }
      if (typeof w.source === 'string') {
        (widget as { source?: string }).source = w.source;
      }
      return widget;
    }
    case 'embed':
      if (typeof w.target !== 'string') return null;
      return { type: 'embed', target: w.target };
    case 'stat':
      return {
        type: 'stat',
        label: typeof w.label === 'string' ? w.label : '',
        value: typeof w.value === 'string'
          ? w.value
          : (typeof w.value === 'number' || typeof w.value === 'boolean')
            ? String(w.value)
            : '',
        trend: typeof w.trend === 'string' ? w.trend : undefined,
        icon: typeof w.icon === 'string' ? w.icon : undefined,
      };
    case 'link':
      if (typeof w.target !== 'string') return null;
      return {
        type: 'link',
        target: w.target,
        description: typeof w.description === 'string' ? w.description : undefined,
      };
    case 'heading': {
      const level = typeof w.level === 'number' && w.level >= 1 && w.level <= 6
        ? w.level as 1 | 2 | 3 | 4 | 5 | 6
        : 3;
      return {
        type: 'heading',
        text: typeof w.text === 'string' ? w.text : '',
        level,
      };
    }
    default:
      return null;
  }
}

/**
 * Serialize a DashboardConfig to YAML for storage in the code block.
 */
export function serializeDashboard(config: DashboardConfig): string {
  const obj: Record<string, unknown> = {};
  if (config.title) obj.title = config.title;

  obj.rows = config.rows.map(row => {
    const r: Record<string, unknown> = {};
    if (row.height !== undefined) r.height = row.height;
    r.columns = row.columns.map(col => {
      const c: Record<string, unknown> = {};
      if (col.width !== undefined) c.width = col.width;
      if (col.widget) c.widget = col.widget;
      return c;
    });
    return r;
  });

  return stringifyYaml(obj).trimEnd();
}
