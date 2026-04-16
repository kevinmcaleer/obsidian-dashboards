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
 * Persist session-only dashboard state (edit mode flag) across re-renders.
 * When the YAML code block changes, Obsidian re-runs the processor with a
 * fresh DOM, so without this the pencil icon would turn off after every edit.
 * Keyed by sourcePath + line number of the code block start.
 */
const stateStore = new Map<string, { editMode: boolean }>();

export function renderDashboard(
  container: HTMLElement,
  config: DashboardConfig,
  app: App,
  sourcePath: string,
  component: Component,
  stateKey: string,
  onChanged: DashboardChangedCallback,
): void {
  container.empty();

  const saved = stateStore.get(stateKey);
  const state: DashboardState = {
    config,
    editMode: saved?.editMode ?? false,
  };

  const persist = () => {
    stateStore.set(stateKey, { editMode: state.editMode });
  };

  const root = container.createDiv({ cls: 'dashboard-root' });

  // Header: pencil toggle on the left, title to its right.
  const header = root.createDiv({ cls: 'dashboard-header' });
  const toggle = header.createEl('button', {
    cls: 'dashboard-mode-toggle',
    attr: { 'aria-label': 'Toggle edit mode' },
  });
  setIcon(toggle, 'pencil');
  if (state.editMode) toggle.classList.add('is-active');
  toggle.addEventListener('click', () => {
    state.editMode = !state.editMode;
    persist();
    toggle.classList.toggle('is-active', state.editMode);
    rebuild();
  });
  if (config.title) {
    header.createDiv({ cls: 'dashboard-title', text: config.title });
  }

  const rowsContainer = root.createDiv({ cls: 'dashboard-rows' });

  // Add row button (only visible in edit mode via CSS)
  const addRowBtn = root.createEl('button', { cls: 'dashboard-add-row', text: '+ Add row' });
  addRowBtn.addEventListener('click', () => {
    state.config.rows.push({ columns: [{}] }); // auto-width column (becomes 12)
    emit(state, onChanged);
  });

  const emitAndRebuild = () => {
    emit(state, onChanged);
    // Note: emit writes YAML to file → Obsidian re-renders the code block,
    // which calls renderDashboard again. No need to call rebuild() here.
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

/**
 * Compute the display width for each column in a row.
 * Columns with an explicit `width` use it; the rest share the remaining
 * space evenly (auto-layout). This gives the "12 → 6/6 → 4/4/4" behaviour.
 */
function computeColumnWidths(row: Row): number[] {
  const explicit = row.columns.map(c => typeof c.width === 'number' ? c.width : null);
  const usedWidth = explicit.reduce((a, w) => a + (w ?? 0), 0);
  const autoCount = explicit.filter(w => w === null).length;

  if (autoCount === 0) {
    return explicit.map(w => Math.max(1, Math.min(12, w ?? 12)));
  }

  const remaining = Math.max(autoCount, 12 - usedWidth);
  const autoWidth = Math.max(1, Math.floor(remaining / autoCount));

  return explicit.map(w => w !== null ? Math.max(1, Math.min(12, w)) : autoWidth);
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
      row.columns.push({}); // auto-width so existing columns redistribute
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
  const widths = computeColumnWidths(row);

  row.columns.forEach((col, colIdx) => {
    renderColumn(grid, col, row, colIdx, widths[colIdx], state, app, sourcePath, component, emit);
  });
}

function renderColumn(
  parent: HTMLElement,
  col: Column,
  row: Row,
  colIdx: number,
  displayedWidth: number,
  state: DashboardState,
  app: App,
  sourcePath: string,
  component: Component,
  emit: () => void,
): void {
  const colEl = parent.createDiv({ cls: 'dashboard-column' });
  colEl.setCssProps({ '--dashboard-col-width': String(displayedWidth) });

  if (state.editMode) {
    const toolbar = colEl.createDiv({ cls: 'dashboard-column-toolbar' });

    toolbar.createEl('span', { cls: 'dashboard-column-label', text: `Col ${colIdx + 1}` });

    const widthSlider = toolbar.createEl('input', {
      type: 'range',
      cls: 'dashboard-column-width',
      attr: { min: '1', max: '12', step: '1' },
      value: String(displayedWidth),
    });
    const widthLabel = toolbar.createEl('span', {
      cls: 'dashboard-column-width-label',
      text: `${displayedWidth}/12`,
    });

    // Live preview: update the CSS var and label as the user drags
    widthSlider.addEventListener('input', () => {
      const v = parseInt(widthSlider.value, 10);
      colEl.setCssProps({ '--dashboard-col-width': String(v) });
      widthLabel.textContent = `${v}/12`;
    });
    // Persist only on release (avoids thrashing the YAML during drag)
    widthSlider.addEventListener('change', () => {
      col.width = parseInt(widthSlider.value, 10);
      emit();
    });

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
