import { App, Component, setIcon } from 'obsidian';
import { DashboardConfig, Row, Column, Widget } from './types';
import { renderWidget, widgetDisplayName } from './widgetRenderer';
import { WidgetEditorModal } from './widgetEditor';
import { serializeDashboard } from './configSerializer';

export type DashboardChangedCallback = (newYaml: string) => void;

export interface DashboardState {
  config: DashboardConfig;
  editMode: boolean;
}

/**
 * Render a dashboard. Returns a cleanup function that should be
 * called before re-rendering.
 */
export function renderDashboard(
  container: HTMLElement,
  config: DashboardConfig,
  app: App,
  sourcePath: string,
  component: Component,
  onChanged: DashboardChangedCallback,
): void {
  container.empty();

  const state: DashboardState = { config, editMode: false };

  const root = container.createDiv({ cls: 'dashboard-root' });

  // Header with title + mode toggle
  const header = root.createDiv({ cls: 'dashboard-header' });
  if (config.title) {
    header.createDiv({ cls: 'dashboard-title', text: config.title });
  } else {
    header.createDiv({ cls: 'dashboard-title dashboard-title--empty' });
  }
  const toggle = header.createEl('button', {
    cls: 'dashboard-mode-toggle',
    attr: { 'aria-label': 'Toggle edit mode' },
  });
  setIcon(toggle, 'pencil');
  toggle.addEventListener('click', () => {
    state.editMode = !state.editMode;
    toggle.classList.toggle('is-active', state.editMode);
    rebuild();
  });

  // Rows container
  const rowsContainer = root.createDiv({ cls: 'dashboard-rows' });

  // Add row button (only in edit mode)
  const addRowBtn = root.createEl('button', { cls: 'dashboard-add-row', text: '+ Add row' });
  addRowBtn.addEventListener('click', () => {
    state.config.rows.push({ columns: [{ width: 12 }] });
    emit(state, onChanged);
    rebuild();
  });

  const emitAndRebuild = () => {
    emit(state, onChanged);
    rebuild();
  };

  function rebuild(): void {
    root.toggleClass('is-edit-mode', state.editMode);
    rowsContainer.empty();

    state.config.rows.forEach((row, rowIdx) => {
      renderRow(rowsContainer, row, rowIdx, state, app, sourcePath, component, emitAndRebuild);
    });

    if (state.config.rows.length === 0 && !state.editMode) {
      rowsContainer.createDiv({
        cls: 'dashboard-empty',
        text: 'This dashboard is empty. Click the pencil icon to edit.',
      });
    }
  }

  rebuild();
}

function renderRow(
  parent: HTMLElement,
  row: Row,
  rowIdx: number,
  state: DashboardState,
  app: App,
  sourcePath: string,
  component: Component,
  emit: () => void,
): void {
  const rowEl = parent.createDiv({ cls: 'dashboard-row' });
  if (row.height) {
    rowEl.addClass('dashboard-row--sized');
    rowEl.setCssProps({ '--dashboard-row-height': `${row.height}px` });
  }

  // Row toolbar (edit mode only)
  if (state.editMode) {
    const toolbar = rowEl.createDiv({ cls: 'dashboard-row-toolbar' });

    const heightInput = toolbar.createEl('input', {
      type: 'number',
      cls: 'dashboard-row-height-input',
      placeholder: 'Height (px)',
      value: row.height ? String(row.height) : '',
    });
    heightInput.addEventListener('change', () => {
      const v = parseInt(heightInput.value, 10);
      if (!isNaN(v) && v > 0) row.height = v;
      else delete row.height;
      emit();
    });

    const addColBtn = toolbar.createEl('button', { cls: 'dashboard-btn', text: '+ Column' });
    addColBtn.addEventListener('click', () => {
      row.columns.push({ width: 6 });
      emit();
    });

    const deleteRowBtn = toolbar.createEl('button', {
      cls: 'dashboard-btn dashboard-btn--danger',
      attr: { 'aria-label': 'Delete row' },
    });
    setIcon(deleteRowBtn, 'trash-2');
    deleteRowBtn.addEventListener('click', () => {
      state.config.rows.splice(rowIdx, 1);
      emit();
    });
  }

  const grid = rowEl.createDiv({ cls: 'dashboard-row-grid' });

  row.columns.forEach((col, colIdx) => {
    renderColumn(grid, col, row, colIdx, state, app, sourcePath, component, emit);
  });
}

function renderColumn(
  parent: HTMLElement,
  col: Column,
  row: Row,
  colIdx: number,
  state: DashboardState,
  app: App,
  sourcePath: string,
  component: Component,
  emit: () => void,
): void {
  const colEl = parent.createDiv({ cls: 'dashboard-column' });
  const width = col.width ?? Math.floor(12 / Math.max(1, row.columns.length));
  colEl.setCssProps({ '--dashboard-col-width': String(width) });

  // Column toolbar (edit mode only)
  if (state.editMode) {
    const toolbar = colEl.createDiv({ cls: 'dashboard-column-toolbar' });

    toolbar.createEl('span', { cls: 'dashboard-column-label', text: `Col ${colIdx + 1}` });

    const widthSlider = toolbar.createEl('input', {
      type: 'range',
      cls: 'dashboard-column-width',
      attr: { min: '1', max: '12', step: '1' },
      value: String(width),
    });
    widthSlider.addEventListener('change', () => {
      col.width = parseInt(widthSlider.value, 10);
      emit();
    });
    toolbar.createEl('span', { cls: 'dashboard-column-width-label', text: `${width}/12` });

    const editBtn = toolbar.createEl('button', {
      cls: 'dashboard-btn',
      attr: { 'aria-label': col.widget ? 'Edit widget' : 'Add widget' },
    });
    setIcon(editBtn, col.widget ? 'pencil' : 'plus');
    editBtn.addEventListener('click', () => {
      new WidgetEditorModal(app, col.widget, (widget: Widget) => {
        col.widget = widget;
        emit();
      }).open();
    });

    const deleteBtn = toolbar.createEl('button', {
      cls: 'dashboard-btn dashboard-btn--danger',
      attr: { 'aria-label': 'Delete column' },
    });
    setIcon(deleteBtn, 'trash-2');
    deleteBtn.addEventListener('click', () => {
      row.columns.splice(colIdx, 1);
      emit();
    });
  }

  const body = colEl.createDiv({ cls: 'dashboard-column-body' });

  if (col.widget) {
    void renderWidget(body, col.widget, app, sourcePath, component);
  } else {
    const empty = body.createDiv({ cls: 'dashboard-column-empty' });
    if (state.editMode) {
      const addBtn = empty.createEl('button', { cls: 'dashboard-add-widget-btn', text: '+ Add widget' });
      addBtn.addEventListener('click', () => {
        new WidgetEditorModal(app, undefined, (widget: Widget) => {
          col.widget = widget;
          emit();
        }).open();
      });
    } else {
      empty.textContent = '(empty)';
    }
  }

  if (state.editMode) {
    const label = colEl.createDiv({ cls: 'dashboard-widget-label' });
    label.textContent = col.widget ? widgetDisplayName(col.widget) : 'Empty';
  }
}

function emit(state: DashboardState, onChanged: DashboardChangedCallback): void {
  onChanged(serializeDashboard(state.config));
}
