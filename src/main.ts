import { Plugin, MarkdownPostProcessorContext, Component, TFile } from 'obsidian';
import { parseDashboard } from './configSerializer';
import { renderDashboard } from './dashboardRenderer';

export default class DashboardsPlugin extends Plugin {
  onload(): void {
    this.registerMarkdownCodeBlockProcessor('dashboard', (source, el, ctx) => {
      this.processDashboard(source, el, ctx);
    });

    this.addCommand({
      id: 'insert-dashboard',
      name: 'Insert dashboard',
      editorCallback: (editor) => {
        const template = [
          '```dashboard',
          'title: New dashboard',
          'rows:',
          '  - columns:',
          '      - width: 12',
          '```',
        ].join('\n');
        editor.replaceSelection(template + '\n');
      },
    });
  }

  private processDashboard(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): void {
    const config = parseDashboard(source) ?? { rows: [] };
    if (!config) {
      el.createDiv({ cls: 'dashboard-error', text: 'Invalid dashboard configuration. Check your YAML syntax.' });
      return;
    }

    // Component lifecycle tracks child renderers (for MarkdownRenderer.render)
    const component = new Component();
    component.load();

    // Key used to persist session-only UI state (edit mode) across re-renders.
    // When the YAML changes, Obsidian re-runs this processor with a new DOM.
    const sectionInfo = ctx.getSectionInfo(el);
    const stateKey = `${ctx.sourcePath}:${sectionInfo?.lineStart ?? 0}`;

    renderDashboard(el, config, this.app, ctx.sourcePath, component, stateKey, (newYaml) => {
      void this.updateCodeBlock(ctx, el, newYaml);
    });

    // Cleanup observer: when el is removed from DOM, unload the component
    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        component.unload();
        observer.disconnect();
      }
    });
    if (el.parentElement) {
      observer.observe(el.parentElement, { childList: true });
    }
  }

  private async updateCodeBlock(
    ctx: MarkdownPostProcessorContext,
    el: HTMLElement,
    newYaml: string,
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;

    const sectionInfo = ctx.getSectionInfo(el);
    if (sectionInfo) {
      await this.app.vault.process(file, (content) => {
        const lines = content.split('\n');
        const before = lines.slice(0, sectionInfo.lineStart + 1);
        const after = lines.slice(sectionInfo.lineEnd);
        return [...before, newYaml, ...after].join('\n');
      });
    } else {
      await this.app.vault.process(file, (content) => {
        const regex = /(```dashboard\n)([\s\S]*?)(```)/;
        return content.replace(regex, `$1${newYaml}\n$3`);
      });
    }
  }
}
