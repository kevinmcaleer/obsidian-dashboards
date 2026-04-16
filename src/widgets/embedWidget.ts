import { App, Component, MarkdownRenderer } from 'obsidian';
import { EmbedWidget } from '../types';

/**
 * Render an embed widget using Obsidian's native transclusion.
 * The target should be a wikilink-style reference like "[[My note]]"
 * or "[[My note#Section]]".
 */
export async function renderEmbedWidget(
  container: HTMLElement,
  widget: EmbedWidget,
  app: App,
  sourcePath: string,
  component: Component,
): Promise<void> {
  const target = widget.target.trim();
  // Ensure it's wrapped in wikilink brackets for the embed syntax
  const wikilink = target.startsWith('[[') ? target : `[[${target}]]`;
  const markdown = `!${wikilink}`;
  await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
}
