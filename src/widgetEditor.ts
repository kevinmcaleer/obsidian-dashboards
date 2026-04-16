import { App, Modal, Setting, parseYaml, stringifyYaml } from 'obsidian';
import { Widget, WidgetType } from './types';

const WIDGET_TYPES: { value: WidgetType; label: string; description: string }[] = [
  { value: 'markdown', label: 'Markdown', description: 'Text, lists, wikilinks, or any markdown' },
  { value: 'chart', label: 'Chart', description: 'Bases chart — inline config or from another note' },
  { value: 'embed', label: 'Embed', description: 'Transclude another note or section' },
  { value: 'stat', label: 'Stat', description: 'Big-number KPI card' },
  { value: 'link', label: 'Link', description: 'Link card to another note' },
  { value: 'heading', label: 'Heading', description: 'Section header' },
];

export class WidgetEditorModal extends Modal {
  private widget: Widget;
  private onSave: (widget: Widget) => void;
  private body: HTMLElement;

  constructor(app: App, initial: Widget | undefined, onSave: (widget: Widget) => void) {
    super(app);
    this.widget = initial ?? { type: 'markdown', content: '' };
    this.onSave = onSave;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('dashboard-widget-editor');

    contentEl.createEl('h2', { text: 'Edit widget' });

    new Setting(contentEl)
      .setName('Widget type')
      .setDesc('Choose the kind of content this widget displays')
      .addDropdown((dd) => {
        for (const t of WIDGET_TYPES) dd.addOption(t.value, t.label);
        dd.setValue(this.widget.type);
        dd.onChange((val) => {
          this.widget = this.createDefaultForType(val as WidgetType);
          this.renderFields();
        });
      });

    this.body = contentEl.createDiv({ cls: 'dashboard-widget-editor-body' });
    this.renderFields();

    const buttons = contentEl.createDiv({ cls: 'dashboard-widget-editor-buttons' });
    buttons.createEl('button', { text: 'Cancel' })
      .addEventListener('click', () => this.close());
    const saveBtn = buttons.createEl('button', { cls: 'mod-cta', text: 'Save' });
    saveBtn.addEventListener('click', () => {
      this.onSave(this.widget);
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private createDefaultForType(type: WidgetType): Widget {
    switch (type) {
      case 'markdown': return { type: 'markdown', content: '' };
      case 'chart': return { type: 'chart', chart: { type: 'bar', sql: '' } };
      case 'embed': return { type: 'embed', target: '' };
      case 'stat': return { type: 'stat', label: '', value: '' };
      case 'link': return { type: 'link', target: '' };
      case 'heading': return { type: 'heading', text: '', level: 3 };
    }
  }

  private renderFields(): void {
    this.body.empty();
    switch (this.widget.type) {
      case 'markdown': return this.renderMarkdownFields();
      case 'chart': return this.renderChartFields();
      case 'embed': return this.renderEmbedFields();
      case 'stat': return this.renderStatFields();
      case 'link': return this.renderLinkFields();
      case 'heading': return this.renderHeadingFields();
    }
  }

  private renderMarkdownFields(): void {
    if (this.widget.type !== 'markdown') return;
    const w = this.widget;
    new Setting(this.body)
      .setName('Content')
      .setDesc('Markdown content. Wikilinks, embeds, and code blocks all work.')
      .addTextArea((ta) => {
        ta.setValue(w.content).onChange((val) => { w.content = val; });
        ta.inputEl.rows = 8;
        ta.inputEl.addClass('dashboard-widget-editor-textarea');
      });
  }

  private renderChartFields(): void {
    if (this.widget.type !== 'chart') return;
    const w = this.widget;

    const mode = w.source ? 'source' : 'inline';

    new Setting(this.body)
      .setName('Chart source')
      .setDesc('Inline config, or link to a note that contains a bases-chart block')
      .addDropdown((dd) => {
        dd.addOption('inline', 'Inline config');
        dd.addOption('source', 'Link to note');
        dd.setValue(mode);
        dd.onChange((val) => {
          if (val === 'inline') {
            delete w.source;
            if (!w.chart) w.chart = { type: 'bar', sql: '' };
          } else {
            delete w.chart;
            if (!w.source) w.source = '';
          }
          this.renderFields();
        });
      });

    if (w.chart) {
      new Setting(this.body)
        .setName('Chart YAML')
        .setDesc('Bases-chart config: type, sql, title, colors, etc.')
        .addTextArea((ta) => {
          ta.setValue(stringifyYaml(w.chart).trimEnd()).onChange((val) => {
            try {
              const parsed = parseYaml(val) as Record<string, unknown> | null;
              if (parsed && typeof parsed === 'object') w.chart = parsed;
            } catch {
              // Ignore parse errors while typing
            }
          });
          ta.inputEl.rows = 10;
          ta.inputEl.addClass('dashboard-widget-editor-textarea');
          ta.inputEl.addClass('dashboard-widget-editor-code');
        });
    } else {
      new Setting(this.body)
        .setName('Note link')
        .setDesc('Wikilink to a note with a bases-chart block, e.g. "[[Charts/Projects]]"')
        .addText((t) => {
          t.setValue(w.source || '').onChange((val) => { w.source = val; });
          t.inputEl.addClass('dashboard-widget-editor-input');
        });
    }
  }

  private renderEmbedFields(): void {
    if (this.widget.type !== 'embed') return;
    const w = this.widget;
    new Setting(this.body)
      .setName('Target')
      .setDesc('Wikilink to the note or section to transclude, e.g. "[[Weekly summary]]"')
      .addText((t) => {
        t.setValue(w.target).onChange((val) => { w.target = val; });
        t.inputEl.addClass('dashboard-widget-editor-input');
      });
  }

  private renderStatFields(): void {
    if (this.widget.type !== 'stat') return;
    const w = this.widget;
    new Setting(this.body).setName('Value').addText((t) => {
      t.setValue(w.value).onChange((val) => { w.value = val; });
    });
    new Setting(this.body).setName('Label').addText((t) => {
      t.setValue(w.label).onChange((val) => { w.label = val; });
    });
    new Setting(this.body).setName('Trend').setDesc('Optional, e.g. "+3" or "-5%"').addText((t) => {
      t.setValue(w.trend || '').onChange((val) => { w.trend = val || undefined; });
    });
    new Setting(this.body).setName('Icon').setDesc('Optional Lucide icon name').addText((t) => {
      t.setValue(w.icon || '').onChange((val) => { w.icon = val || undefined; });
    });
  }

  private renderLinkFields(): void {
    if (this.widget.type !== 'link') return;
    const w = this.widget;
    new Setting(this.body).setName('Target').setDesc('Note to link to').addText((t) => {
      t.setValue(w.target).onChange((val) => { w.target = val; });
    });
    new Setting(this.body).setName('Description').setDesc('Optional override').addText((t) => {
      t.setValue(w.description || '').onChange((val) => { w.description = val || undefined; });
    });
  }

  private renderHeadingFields(): void {
    if (this.widget.type !== 'heading') return;
    const w = this.widget;
    new Setting(this.body).setName('Text').addText((t) => {
      t.setValue(w.text).onChange((val) => { w.text = val; });
    });
    new Setting(this.body).setName('Level').addDropdown((dd) => {
      for (let i = 1; i <= 6; i++) dd.addOption(String(i), `H${i}`);
      dd.setValue(String(w.level || 3));
      dd.onChange((val) => { w.level = parseInt(val, 10) as 1 | 2 | 3 | 4 | 5 | 6; });
    });
  }
}
