import { App, Component, MarkdownRenderer } from 'obsidian';
import { MarkdownWidget } from '../types';

export async function renderMarkdownWidget(
  container: HTMLElement,
  widget: MarkdownWidget,
  app: App,
  sourcePath: string,
  component: Component,
): Promise<void> {
  const content = widget.content || '';
  await MarkdownRenderer.render(app, content, container, sourcePath, component);
}
