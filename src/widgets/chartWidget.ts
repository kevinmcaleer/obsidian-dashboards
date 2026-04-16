import { App, Component, MarkdownRenderer, stringifyYaml } from 'obsidian';
import { ChartWidget } from '../types';

/**
 * Render a chart widget. Supports two modes:
 *   1. Inline: widget.chart is a bases-chart config object
 *   2. Source: widget.source is a wikilink to a note with a bases-chart block
 *
 * In both cases we delegate rendering to the bases-chart plugin by
 * producing a `bases-chart` code block and running it through
 * MarkdownRenderer. The bases-chart plugin's registered processor
 * picks it up automatically.
 */
export async function renderChartWidget(
  container: HTMLElement,
  widget: ChartWidget,
  app: App,
  sourcePath: string,
  component: Component,
): Promise<void> {
  if (widget.chart) {
    const yaml = stringifyYaml(widget.chart).trimEnd();
    const markdown = '```bases-chart\n' + yaml + '\n```';
    await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
    return;
  }

  if (widget.source) {
    const content = await readChartBlockFromNote(app, widget.source);
    if (content) {
      await MarkdownRenderer.render(app, content, container, sourcePath, component);
    } else {
      renderError(container, `No bases-chart block found in ${widget.source}`);
    }
    return;
  }

  renderError(container, 'Chart widget has neither inline config nor a source link.');
}

async function readChartBlockFromNote(app: App, source: string): Promise<string | null> {
  // Extract target from wikilink syntax: [[Some note]] or [[Some note|alias]]
  const target = source.replace(/^\[\[|\]\]$/g, '').split('|')[0].trim();
  const file = app.metadataCache.getFirstLinkpathDest(target, '');
  if (!file) return null;

  const content = await app.vault.cachedRead(file);
  const match = content.match(/```bases-chart\n([\s\S]*?)```/);
  if (!match) return null;
  return '```bases-chart\n' + match[1] + '```';
}

function renderError(container: HTMLElement, message: string): void {
  container.createDiv({ cls: 'dashboard-widget-error', text: message });
}
