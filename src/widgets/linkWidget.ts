import { App, TFile } from 'obsidian';
import { LinkWidget } from '../types';

export function renderLinkWidget(container: HTMLElement, widget: LinkWidget, app: App): void {
  const target = widget.target.replace(/^\[\[|\]\]$/g, '').split('|')[0].trim();

  const card = container.createEl('a', { cls: 'dashboard-link' });
  card.setAttribute('href', target);
  card.dataset.href = target;

  card.createDiv({ cls: 'dashboard-link-title', text: target });

  if (widget.description) {
    card.createDiv({ cls: 'dashboard-link-description', text: widget.description });
  } else {
    const file = app.metadataCache.getFirstLinkpathDest(target, '');
    if (file instanceof TFile) {
      const cache = app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (fm && typeof fm.description === 'string') {
        card.createDiv({ cls: 'dashboard-link-description', text: fm.description });
      }
    }
  }

  card.addEventListener('click', (e) => {
    e.preventDefault();
    app.workspace.openLinkText(target, '', false);
  });
}
