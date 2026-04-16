import { App, Component } from 'obsidian';
import { Widget } from './types';
import { renderMarkdownWidget } from './widgets/markdownWidget';
import { renderChartWidget } from './widgets/chartWidget';
import { renderEmbedWidget } from './widgets/embedWidget';
import { renderStatWidget } from './widgets/statWidget';
import { renderLinkWidget } from './widgets/linkWidget';
import { renderHeadingWidget } from './widgets/headingWidget';

export async function renderWidget(
  container: HTMLElement,
  widget: Widget,
  app: App,
  sourcePath: string,
  component: Component,
): Promise<void> {
  container.addClass('dashboard-widget');
  container.addClass(`dashboard-widget--${widget.type}`);

  try {
    switch (widget.type) {
      case 'markdown':
        return await renderMarkdownWidget(container, widget, app, sourcePath, component);
      case 'chart':
        return await renderChartWidget(container, widget, app, sourcePath, component);
      case 'embed':
        return await renderEmbedWidget(container, widget, app, sourcePath, component);
      case 'stat':
        return renderStatWidget(container, widget);
      case 'link':
        return renderLinkWidget(container, widget, app);
      case 'heading':
        return renderHeadingWidget(container, widget);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    container.createDiv({ cls: 'dashboard-widget-error', text: `Widget error: ${message}` });
  }
}

export function widgetDisplayName(widget: Widget): string {
  switch (widget.type) {
    case 'markdown': return 'Markdown';
    case 'chart': return widget.source ? `Chart (${widget.source})` : 'Chart (inline)';
    case 'embed': return `Embed: ${widget.target}`;
    case 'stat': return `Stat: ${widget.label}`;
    case 'link': return `Link: ${widget.target}`;
    case 'heading': return `Heading: ${widget.text}`;
  }
}
