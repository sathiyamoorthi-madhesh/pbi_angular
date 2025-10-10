import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

import { CoreService } from '../../../services/core.service';

export interface TableEditEvent {
  label: string;
  MatrixTable_row: string[];
  MatrixTable_columns: string[];
  MatrixTable_values: string[];
  aggregationFields?: { [key: string]: string };
  uniqueIddata: any;
  aggregationType: string;
  [key: string]: any;
  selectchartfunction: boolean;
}
export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

interface ColumnHeader {
  key: string;
  display: string;
  comboValues: string[];
  valueField: string;
}

@Component({
  selector: 'app-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matrix.component.html',
  styleUrls: ['./matrix.component.scss'],
})
export class MatrixComponent implements OnInit, OnDestroy, OnChanges {
  @Input() label: string = 'MatrixTable';
  @Input() uniqueId: any = '';

  @Input() MatrixTable_row: string[] = [];
  @Input() MatrixTable_columns: string[] = [];
  @Input() MatrixTable_values: string[] = [];

  @Input() aggregationFields: { [valueField: string]: string } = {};
  @Input() aggregationType: string = 'sum';

  @Input() showCharts: boolean = true;
  @Input() chartIcons: any[] = [];
  @Input() aggregationFieldKey: string = '';

  @Input() showRowTotals: boolean = true;
  @Input() showColumnTotals: boolean = true;

  @Output() editClicked = new EventEmitter<TableEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<number>();

  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  tableData: any[] = [];
  aggregatedData: any[] = [];
  columnHeaders: ColumnHeader[] = [];
  columnTotals: { [key: string]: number } = {};
  rowTotalKey = '__rowTotal';
  grandTotal = 0;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private dataSubscription?: Subscription;

  constructor(private coreService: CoreService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['MatrixTable_row'] ||
      changes['MatrixTable_columns'] ||
      changes['MatrixTable_values'] ||
      changes['aggregationFields'] ||
      changes['aggregationType']
    ) {
      if (this.tableData?.length) {
        this.buildAll();
      }
    }
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  loadChartData() {
    this.dataSubscription = this.coreService.getChartData(this.label).subscribe((data) => {
      if (this.uniqueId === data.uniqueIddata) {
        if (this.showCharts) this.showCharts = false;

        this.aggregationType = (data.aggregationType || data.aggregation || this.aggregationType || 'sum').toString();

        if (data?.data?.length) {
          this.tableData = data.data;
          if (data.aggregation && typeof data.aggregation === 'object') {
            this.aggregationFields = data.aggregation;
          }

          if (!this.MatrixTable_row.length && !this.MatrixTable_columns.length && !this.MatrixTable_values.length) {
            const sample = this.tableData[0];
            for (const key of Object.keys(sample)) {
              if (typeof sample[key] === 'number') this.MatrixTable_values.push(key);
              else this.MatrixTable_row.push(key);
            }
          }

          this.buildAll();
        }
      }
    });
  }

  private buildAll() {
    this.buildColumnHeaders();
    this.buildPivotRows();
    this.buildTotals();
  }

  private buildColumnHeaders() {
    this.columnHeaders = [];

    if (!this.tableData.length || !this.MatrixTable_columns.length || !this.MatrixTable_values.length) {
      if (this.MatrixTable_values.length) {
        for (const v of this.MatrixTable_values) {
          this.columnHeaders.push({
            key: v,
            display: v,
            comboValues: [],
            valueField: v,
          });
        }
      }
      return;
    }

    const arraysOfUniques: string[][] = this.MatrixTable_columns.map((col) => {
      const set = new Set<string>();
      this.tableData.forEach((r) => set.add(String(r[col])));
      return Array.from(set);
    });

    const combos = this.cartesian(arraysOfUniques);
    for (const combo of combos) {
      for (const v of this.MatrixTable_values) {
        this.columnHeaders.push({
          key: [...combo, v].join('_'),
          display: `${combo.join(' | ')} - ${v}`,
          comboValues: combo,
          valueField: v,
        });
      }
    }
  }

  private buildPivotRows() {
    const groupMap = new Map<string, any[]>();
    for (const r of this.tableData) {
      const key = this.MatrixTable_row.map((f) => String(r[f])).join('|');
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(r);
    }

    this.aggregatedData = [];
    for (const [rowKey, rows] of groupMap.entries()) {
      const out: any = {};
      const parts = rowKey.split('|');
      this.MatrixTable_row.forEach((f, i) => (out[f] = parts[i]));

      for (const header of this.columnHeaders) {
        const subset = this.filterByCombo(rows, header.comboValues);
        const vals = subset.map((r) => +r[header.valueField]).filter((v) => !isNaN(v));
        const method = (this.aggregationFields[header.valueField] || this.aggregationType || 'sum').toLowerCase();
        const agg = this.aggregate(vals, method);
        out[header.key] = this.formatNumber(agg);
      }

      if (!this.columnHeaders.length && this.MatrixTable_values.length) {
        for (const v of this.MatrixTable_values) {
          const vals = rows.map((r) => +r[v]).filter((x) => !isNaN(x));
          const method = (this.aggregationFields[v] || this.aggregationType || 'sum').toLowerCase();
          const agg = this.aggregate(vals, method);
          out[v] = this.formatNumber(agg);
        }
      }

      this.aggregatedData.push(out);
    }
  }

  private buildTotals() {
    this.columnTotals = {};
    this.grandTotal = 0;

    for (const header of this.columnHeaders) {
      let colSum = 0;
      for (const row of this.aggregatedData) {
        const n = parseFloat(row[header.key] ?? '0');
        if (!isNaN(n)) colSum += n;
      }
      this.columnTotals[header.key] = colSum;
      this.grandTotal += colSum;
    }

    if (this.showRowTotals) {
      for (const row of this.aggregatedData) {
        let sum = 0;
        for (const header of this.columnHeaders) {
          const n = parseFloat(row[header.key] ?? '0');
          if (!isNaN(n)) sum += n;
        }

        if (!this.columnHeaders.length && this.MatrixTable_values.length) {
          sum = 0;
          for (const v of this.MatrixTable_values) {
            const n = parseFloat(row[v] ?? '0');
            if (!isNaN(n)) sum += n;
          }
        }

        row[this.rowTotalKey] = this.formatNumber(sum);
      }
    }
  }

  private cartesian(arrays: string[][]): string[][] {
    if (!arrays.length) return [[]];
    const [first, ...rest] = arrays;
    const tail = this.cartesian(rest);
    const out: string[][] = [];
    for (const f of first) for (const t of tail) out.push([f, ...t]);
    return out;
  }

  private filterByCombo(rows: any[], combo: string[]): any[] {
    if (!this.MatrixTable_columns.length || !combo.length) return rows;
    return rows.filter((r) =>
      this.MatrixTable_columns.every((col, i) => String(r[col]) === String(combo[i]))
    );
  }

  private aggregate(values: number[], method: string): number {
    switch (method) {
      case 'sum':
        return d3.sum(values);
      case 'avg':
      case 'average':
        return values.length ? d3.sum(values) / values.length : 0;
      case 'min':
        return values.length ? (d3.min(values) as number) : 0;
      case 'max':
        return values.length ? (d3.max(values) as number) : 0;
      case 'count':
        return values.length;
      case 'countdistinct':
      case 'count distinct':
        return new Set(values).size;
      default:
        return d3.sum(values);
    }
  }

  private formatNumber(n: number): string {
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  sortData(columnKey: string): void {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }

    this.aggregatedData.sort((a, b) => {
      const A = a[columnKey];
      const B = b[columnKey];

      const nA = parseFloat(A);
      const nB = parseFloat(B);
      let cmp: number;

      if (!isNaN(nA) && !isNaN(nB)) {
        cmp = nA - nB;
      } else {
        cmp = String(A ?? '').localeCompare(String(B ?? ''));
      }

      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  exportToExcel(): void {
    const worksheet = XLSX.utils.json_to_sheet(this.aggregatedData);
    const workbook = { Sheets: { Data: worksheet }, SheetNames: ['Data'] };
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    FileSaver.saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'matrix_export.xlsx');
  }

  handleClick(): void {
    const chartConfig = this.chartIcons?.find((c) => c.label === this.label);

    const payload: TableEditEvent = {
      label: this.label,
      MatrixTable_row: this.MatrixTable_row,
      MatrixTable_columns: this.MatrixTable_columns,
      MatrixTable_values: this.MatrixTable_values,
      aggregationFields: this.aggregationFields,
      aggregationType: this.aggregationType,
      uniqueIddata: this.uniqueId,
      aggregationFieldKey: this.aggregationFieldKey,
      selectchartfunction: true,
    };

    (chartConfig?.fields || []).forEach((fieldKey: string) => {
      const v = (this as any)[fieldKey];
      if (v !== undefined) (payload as any)[fieldKey] = v;
    });

    this.editClicked.emit(payload);
  }

  hidethepage(): void {
    this.resetComponent();
    this.editClickeds.emit({ label: this.label, selectchartfunction: false });
    this.deleteChart.emit(this.uniqueId);
  }

  private resetComponent(): void {
    this.label = 'MatrixTable';
    this.tableData = [];
    this.aggregatedData = [];
    this.columnHeaders = [];
    this.columnTotals = {};
    this.MatrixTable_row = [];
    this.MatrixTable_columns = [];
    this.MatrixTable_values = [];
    this.aggregationFields = {};
    this.showCharts = true;
    this.sortColumn = '';
    this.sortDirection = 'asc';
    this.grandTotal = 0;
  }
}
