export type WidgetType = 'markdown' | 'chart' | 'embed' | 'stat' | 'link' | 'heading';

export interface MarkdownWidget {
  type: 'markdown';
  content: string;
}

export interface ChartWidget {
  type: 'chart';
  /** Inline bases-chart YAML config (mutually exclusive with source). */
  chart?: Record<string, unknown>;
  /** Wikilink to a note that contains a bases-chart code block. */
  source?: string;
}

export interface EmbedWidget {
  type: 'embed';
  target: string;
}

export interface StatWidget {
  type: 'stat';
  label: string;
  value: string;
  trend?: string;
  icon?: string;
}

export interface LinkWidget {
  type: 'link';
  target: string;
  description?: string;
}

export interface HeadingWidget {
  type: 'heading';
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export type Widget =
  | MarkdownWidget
  | ChartWidget
  | EmbedWidget
  | StatWidget
  | LinkWidget
  | HeadingWidget;

export interface Column {
  /** 1-12 column span (Bootstrap-style). If omitted, columns auto-distribute. */
  width?: number;
  widget?: Widget;
}

export interface Row {
  /** Pixel height, or omitted for content-driven height. */
  height?: number;
  columns: Column[];
}

export interface DashboardConfig {
  title?: string;
  rows: Row[];
}
