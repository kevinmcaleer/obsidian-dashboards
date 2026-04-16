import { setIcon } from 'obsidian';
import { StatWidget } from '../types';

export function renderStatWidget(container: HTMLElement, widget: StatWidget): void {
  const card = container.createDiv({ cls: 'dashboard-stat' });

  if (widget.icon) {
    const iconEl = card.createDiv({ cls: 'dashboard-stat-icon' });
    setIcon(iconEl, widget.icon);
  }

  card.createDiv({ cls: 'dashboard-stat-value', text: widget.value });
  card.createDiv({ cls: 'dashboard-stat-label', text: widget.label });

  if (widget.trend) {
    const trendCls = widget.trend.startsWith('-')
      ? 'dashboard-stat-trend is-negative'
      : widget.trend.startsWith('+')
        ? 'dashboard-stat-trend is-positive'
        : 'dashboard-stat-trend';
    card.createDiv({ cls: trendCls, text: widget.trend });
  }
}
