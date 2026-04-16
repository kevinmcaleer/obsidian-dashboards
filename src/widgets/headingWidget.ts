import { HeadingWidget } from '../types';

export function renderHeadingWidget(container: HTMLElement, widget: HeadingWidget): void {
  const level = widget.level || 3;
  const tag = `h${level}` as keyof HTMLElementTagNameMap;
  container.createEl(tag, { cls: 'dashboard-heading', text: widget.text });
}
