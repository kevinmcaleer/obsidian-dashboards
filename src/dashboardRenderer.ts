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
  const addRowBtn = root.createEl('button', { cls: 'dashboard-add-row', text: '+ add row' });
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
  const explicit: Array<number | null> = row.columns.map(c => typeof c.width === 'number' ? c.width : null);
  const usedWidth: number = explicit.reduce<number>((a, w) => a + (w ?? 0), 0);
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

    const addColBtn = toolbar.createEl('button', { cls: 'dashboard-btn', text: '+ column' });
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

    const fitBtn = toolbar.createEl('button', {
      cls: 'dashboard-btn',
      attr: { 'aria-label': 'Fit to available space' },
    });
    setIcon(fitBtn, 'move-horizontal');
    fitBtn.addEventListener('click', () => {
      // Sum the current displayed widths of all other columns; this column
      // takes whatever's left (clamped to 1..12).
      const widths = computeColumnWidths(row);
      const othersTotal = widths.reduce((sum, w, i) => i === colIdx ? sum : sum + w, 0);
      col.width = Math.max(1, Math.min(12, 12 - othersTotal));
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
      const addBtn = empty.createEl('button', { cls: 'dashboard-add-widget-btn', text: '+ add widget' });
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

  // Resize handle on the right edge (not on the last column).
  // Drags transfer units between this column and the next: left grows → right shrinks.
  const isLastColumn = colIdx === row.columns.length - 1;
  if (state.editMode && !isLastColumn) {
    addResizeHandle(colEl, row, colIdx, emit);
  }
}

function addResizeHandle(colEl: HTMLElement, row: Row, colIdx: number, emit: () => void): void {
  const handle = colEl.createDiv({
    cls: 'dashboard-column-resize-handle',
    attr: { 'aria-label': 'Resize columns' },
  });

  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    const rightColEl = colEl.nextElementSibling as HTMLElement | null;
    const grid = colEl.parentElement;
    if (!rightColEl || !grid) return;

    const rightCol = row.columns[colIdx + 1];
    if (!rightCol) return;

    // Grid column unit size in pixels (total width / 12). Close enough
    // for responsive feedback; gap introduces tiny error that doesn't matter.
    const gridRect = grid.getBoundingClientRect();
    const unitPx = gridRect.width / 12;
    const startX = e.clientX;

    const readUnits = (el: HTMLElement): number =>
      parseInt(el.style.getPropertyValue('--dashboard-col-width') || '1', 10) || 1;

    const startLeft = readUnits(colEl);
    const startRight = readUnits(rightColEl);
    const total = startLeft + startRight;

    handle.classList.add('is-dragging');
    document.body.classList.add('dashboard-resizing');

    const onMove = (ev: PointerEvent) => {
      const deltaPx = ev.clientX - startX;
      const deltaUnits = Math.round(deltaPx / unitPx);
      let newLeft = startLeft + deltaUnits;
      let newRight = startRight - deltaUnits;

      // Clamp so both columns keep at least 1 unit
      if (newLeft < 1) { newLeft = 1; newRight = total - 1; }
      if (newRight < 1) { newRight = 1; newLeft = total - 1; }

      colEl.setCssProps({ '--dashboard-col-width': String(newLeft) });
      rightColEl.setCssProps({ '--dashboard-col-width': String(newRight) });

      updateColumnUi(colEl, newLeft);
      updateColumnUi(rightColEl, newRight);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      handle.classList.remove('is-dragging');
      document.body.classList.remove('dashboard-resizing');

      const finalLeft = readUnits(colEl);
      const finalRight = readUnits(rightColEl);
      // Only persist if something actually changed
      if (finalLeft !== startLeft || finalRight !== startRight) {
        row.columns[colIdx].width = finalLeft;
        row.columns[colIdx + 1].width = finalRight;
        emit();
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

/**
 * Sync the visible slider value and "N/12" label inside a column when its
 * width changes via the resize handle (keeps the toolbar in lockstep).
 */
function updateColumnUi(colEl: HTMLElement, width: number): void {
  const slider = colEl.querySelector<HTMLInputElement>('.dashboard-column-width');
  if (slider) slider.value = String(width);
  const label = colEl.querySelector<HTMLElement>('.dashboard-column-width-label');
  if (label) label.textContent = `${width}/12`;
}

function emit(state: DashboardState, onChanged: DashboardChangedCallback): void {
  onChanged(serializeDashboard(state.config));
}
