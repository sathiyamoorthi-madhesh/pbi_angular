import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { CoreService } from '../../../services/core.service';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MaterialImportsModule } from '../../../material.imports';

export interface TableEditEvent {
  label: string;
  Table_columns: string[];
  aggregationFields?: { [key: string]: string };
  uniqueIddata: any;
  aggregationType: any;
  selectchartfunction: boolean;
  tableData?: any[];
  aggregatedData?: any[];
  [key: string]: any;
}

export interface deleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle, MaterialImportsModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() label: string = 'Table';
  @Input() uniqueId: any = '';
  @Input() Table_columns: string[] = [];
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() showCharts: boolean = true;
  @Input() chartIcons: any[] = [];
  @Input() aggregationFieldKey: string = '';

  @Output() editClicked = new EventEmitter<TableEditEvent>();
  @Output() editClickeds = new EventEmitter<deleteChartEdits>();
  @Output() deleteChart = new EventEmitter<number>();

  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  tableData: any[] = [];
  aggregatedData: any[] = [];
  stringFields: string[] = [];
  numericFields: string[] = [];
  selectedExportColumnsMap: { [key: string]: boolean } = {};
  aggregationType: string = '';
  data2: any;
  private highlightSet: Set<string> = new Set(); // For highlighting based on activedata

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private dataSubscription?: Subscription;
  activedata?: any[];

  constructor(private coreService: CoreService) {}

  ngOnInit(): void {
    this.itchartdata();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aggregationFields'] && this.tableData.length) {
      this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);
      this.emitTableUpdate();
    }
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  itchartdata(): void {
    this.dataSubscription = this.coreService.getChartData(this.label).subscribe({
      next: (data) => {
        if (this.uniqueId === data.uniqueIddata) {
          if (this.showCharts) this.showCharts = false;
          this.data2 = data.Table_columns;
          console.log('------------data2--------------------',this.data2);
          this.aggregationType = data.fields[0] || 'Count';

          if (data?.data?.length) {
            this.tableData = data.data;
            this.highlightSet.clear();
            if (data.activedata?.length && this.stringFields.length) {
              data.activedata.forEach((row: any) => {
                const key = this.stringFields.map((f) => row[f]).join('|');
                this.highlightSet.add(key);
              });
            }

            this.aggregationFields = data.aggregation || {};

            if (!this.Table_columns.length) {
              this.Table_columns = Object.keys(this.tableData[0]);
            }

            this.detectFieldTypes();
            this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);

            this.Table_columns = [...this.stringFields, ...this.numericFields];
            for (const col of this.data2) {
              this.selectedExportColumnsMap[col] = true;
            }

            this.emitTableUpdate();
          }
        }
      },
      error: (err) => {
        console.error('Error fetching table data:', err);
      }
    });
  }

  detectFieldTypes(): void {
    if (!this.tableData.length) return;
    const sample = this.tableData[0];
    this.stringFields = [];
    this.numericFields = [];

    for (const key of Object.keys(sample)) {
      if (typeof sample[key] === 'number') {
        this.numericFields.push(key);
      } else {
        this.stringFields.push(key);
      }
    }
  }

  aggregateAndDeduplicate(data: any[]): any[] {
    if (!data.length) return [];

    const groupedMap = new Map<string, any[]>();

    for (const row of data) {
      const key = this.stringFields.map((f) => row[f]).join('|');
      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)?.push(row);
    }

    const result: any[] = [];

    for (const [key, group] of groupedMap.entries()) {
      const base = this.stringFields.reduce((obj, f, i) => {
        obj[f] = key.split('|')[i];
        return obj;
      }, {} as any);

      for (const field of this.numericFields) {
        const values = group.map((r) => +r[field]).filter((v) => !isNaN(v));
        const aggType = (this.aggregationFields[field] || this.aggregationType).toLowerCase();

        switch (aggType) {
          case 'sum':
            base[field] = d3.sum(values).toFixed(2);
            break;
          case 'avg':
          case 'average':
            base[field] = values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
            break;
          case 'min':
            base[field] = d3.min(values)?.toFixed(2) ?? '0.00';
            break;
          case 'max':
            base[field] = d3.max(values)?.toFixed(2) ?? '0.00';
            break;
          case 'count':
            base[field] = values.length.toString();
            break;
          case 'countdistinct':
          case 'count distinct':
            base[field] = new Set(values).size.toString();
            break;
          default:
            base[field] = d3.sum(values).toFixed(2);
        }
      }

      base.isHighlighted = this.highlightSet.has(key);
      result.push(base);
    }

    return result;
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.aggregatedData.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      const comparison =
        typeof valueA === 'number' && typeof valueB === 'number'
          ? valueA - valueB
          : valueA?.toString().localeCompare(valueB?.toString());

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  getGrandTotal(column: string): string {
    if (!this.numericFields.includes(column)) return '';

    const values = this.aggregatedData.map((row) => +row[column]).filter((v) => !isNaN(v));
    return d3.sum(values).toFixed(2);
  }

  getAggregatedValue(column: string): string {
    if (!this.numericFields.includes(column)) return '';

    const values = this.aggregatedData.map((row) => +row[column]).filter((v) => !isNaN(v));
    const aggType = (this.aggregationFields[column] || '').toLowerCase();

    switch (aggType) {
      case 'sum':
        return d3.sum(values).toFixed(2);
      case 'avg':
      case 'average':
        return values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
      case 'min':
        return d3.min(values)?.toFixed(2) ?? '0.00';
      case 'max':
        return d3.max(values)?.toFixed(2) ?? '0.00';
      case 'count':
        return values.length.toString();
      case 'countdistinct':
      case 'count distinct':
        return new Set(values).size.toString();
      default:
        return '';
    }
  }

  exportToExcel(): void {
    const selectedCols = this.Table_columns.filter((col) => this.selectedExportColumnsMap[col]);
    if (!selectedCols.length) {
      alert('Please select at least one column to export.');
      return;
    }

    const exportData = this.aggregatedData.map((row) => {
      const filtered: any = {};
      selectedCols.forEach((col) => (filtered[col] = row[col]));
      return filtered;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: selectedCols });
    worksheet['!cols'] = selectedCols.map((col) => ({
      wch: Math.max(col.length, ...exportData.map((r) => r[col]?.toString()?.length || 0)) + 2
    }));

    const workbook = { Sheets: { Data: worksheet }, SheetNames: ['Data'] };
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    FileSaver.saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'exported_data.xlsx');
  }

  showSwalTable(row: any): void {
    // Filter rows matching the string fields of the selected row
    const matchingRows = this.tableData.filter((r) =>
      this.stringFields.every((f) => r[f] === row[f])
    );

    // Get unique string field values
    const uniqueValues: { [key: string]: any[] } = {};
    this.stringFields.forEach((f) => {
      uniqueValues[f] = [...new Set(matchingRows.map((r) => r[f]))];
    });

    console.log('----------formatted table data----------------', uniqueValues);

    // Send formatted data to service
    this.coreService.Onpostrelationdata(uniqueValues);

    // Keep full data for active usage
    this.activedata = [...matchingRows];
    this.itchartdata();
  }

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) return;

    const chartConfig = this.chartIcons?.find((chart) => chart.label === this.label);

    const payload: TableEditEvent = {
      label: this.label,
      Table_columns: this.data2 || this.Table_columns,
      aggregationFields: this.aggregationFields,
      aggregationType: this.aggregationType,
      uniqueIddata: this.uniqueId,
      aggregationFieldKey: this.aggregationFieldKey,
      selectchartfunction: true,
      tableData: this.tableData,
      aggregatedData: this.aggregatedData,
    };

    (chartConfig?.fields || []).forEach((fieldKey: string) => {
      const value = (this as any)[fieldKey];
      if (value !== undefined) payload[fieldKey] = value;
    });

    this.editClicked.emit(payload);
  }

  hidethepage(): void {
    this.onDeleteFromChild();
    this.editClickeds.emit({
      label: this.label,
      selectchartfunction: false,
    });
    this.OnuniqueIdremove();
  }

  OnuniqueIdremove(): void {
    this.deleteChart.emit(this.uniqueId);
    const Ondata = null;
    this.coreService.Onpostrelationdata(Ondata);
  }

  onDeleteFromChild(): void {
    this.label = 'Table';
    this.tableData = [];
    this.aggregatedData = [];
    this.Table_columns = [];
    this.aggregationFields = {};
    this.highlightSet.clear();
    this.showCharts = true;
  }

  private emitTableUpdate(): void {
    const payload: TableEditEvent = {
      label: this.label,
      Table_columns: this.Table_columns,
      aggregationFields: this.aggregationFields,
      aggregationType: this.aggregationType,
      uniqueIddata: this.uniqueId,
      selectchartfunction: true,
      tableData: this.tableData,
      aggregatedData: this.aggregatedData,
    };
    this.editClicked.emit(payload);
  }
}





































// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   Input,
//   Output,
//   EventEmitter,
//   ViewChild,
//   ElementRef,
//   SimpleChanges,
//   OnChanges,
// } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Subscription } from 'rxjs';
// import * as d3 from 'd3';
// import * as XLSX from 'xlsx';
// import * as FileSaver from 'file-saver';
// import { CoreService } from 'src/app/services/core.service';
// import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

// export interface TableEditEvent {
//   label: string;
//   Table_columns: string[];
//   aggregationFields?: { [key: string]: string };
//   uniqueIddata: any,
//   aggregationType: any,
//   [key: string]: any;
//   selectchartfunction: boolean;
// }
// export interface deleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-table',
//   standalone: true,
//   imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle,],
//   templateUrl: './table.component.html',
//   styleUrls: ['./table.component.scss'],
// })
// export class TableComponent implements OnInit, OnDestroy, OnChanges {
//   @Input() label: string = 'Table';
//   @Input() uniqueId: any = '';
//   @Input() Table_columns: string[] = [];
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() showCharts: boolean = true;
//   @Input() chartIcons: any[] = []; // Provide this from parent if used in handleClick
//   @Input() aggregationFieldKey: string = ''; // Used in payload emission

//   @Output() editClicked = new EventEmitter<TableEditEvent>();
//   @Output() editClickeds = new EventEmitter<deleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<number>();

//   @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

//   tableData: any[] = [];
//   aggregatedData: any[] = [];
//   stringFields: string[] = [];
//   numericFields: string[] = [];
//   selectedExportColumnsMap: { [key: string]: boolean } = {};
//   aggregationType: string = '';
//   data2: any;

//   sortColumn: string = '';
//   sortDirection: 'asc' | 'desc' = 'asc';

//   private dataSubscription?: Subscription;

//   constructor(private coreService: CoreService) { }

//   ngOnInit(): void {
//     this.itchartdata();
//   }

//   itchartdata() {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe((data) => {
//       if (this.uniqueId === data.uniqueIddata) {
//         if (this.showCharts) this.showCharts = false;
//         this.data2 = data.Table_columns;
//         this.aggregationType = data.aggregation || 'Count';
//         console.log('------------------', this.data2);

//         if (data?.data?.length) {
//           this.tableData = data.data;
//           console.log('------------------', this.tableData);
//           this.aggregationFields = data.aggregation || {};

//           if (!this.Table_columns.length) {
//             this.Table_columns = Object.keys(this.tableData[0]);
//           }

//           this.detectFieldTypes();
//           this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);

//           this.Table_columns = [...this.stringFields, ...this.numericFields];
//           for (const col of this.Table_columns) {
//             this.selectedExportColumnsMap[col] = true;
//           }
//         }
//       }
//     });
//   }

//   ngOnChanges(changes: SimpleChanges): void {
//     if (changes['aggregationFields'] && this.tableData.length) {
//       this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);
//     }
//   }
//   getGrandTotal(column: string): string {
//     if (!this.numericFields.includes(column)) return '';

//     const values = this.aggregatedData.map(row => +row[column]).filter(v => !isNaN(v));

//     // Always sum for grand total
//     return d3.sum(values).toFixed(2);
//   }

//   detectFieldTypes(): void {
//     if (!this.tableData.length) return;
//     const sample = this.tableData[0];
//     this.stringFields = [];
//     this.numericFields = [];

//     for (const key of Object.keys(sample)) {
//       if (typeof sample[key] === 'number') {
//         this.numericFields.push(key);
//       } else {
//         this.stringFields.push(key);
//       }
//     }
//   }

//   aggregateAndDeduplicate(data: any[]): any[] {
//     const groupedMap = new Map<string, any[]>();

//     for (const row of data) {
//       const key = this.stringFields.map(f => row[f]).join('|');
//       if (!groupedMap.has(key)) groupedMap.set(key, []);
//       groupedMap.get(key)?.push(row);
//     }

//     const result: any[] = [];

//     for (const [key, group] of groupedMap.entries()) {
//       const base = this.stringFields.reduce((obj, f, i) => {
//         obj[f] = key.split('|')[i];
//         return obj;
//       }, {} as any);

//       for (const field of this.numericFields) {
//         const values = group.map(r => +r[field]).filter(v => !isNaN(v));
//         const aggType = (this.aggregationFields[field] || this.aggregationType).toLowerCase();

//         switch (aggType) {
//           case 'sum':
//             base[field] = d3.sum(values).toFixed(2);
//             break;
//           case 'avg':
//           case 'average':
//             base[field] = values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
//             break;
//           case 'min':
//             base[field] = d3.min(values)?.toFixed(2) ?? '0.00';
//             break;
//           case 'max':
//             base[field] = d3.max(values)?.toFixed(2) ?? '0.00';
//             break;
//           case 'count':
//             base[field] = values.length.toString();
//             break;
//           case 'countdistinct':
//           case 'count distinct':
//             base[field] = new Set(values).size.toString();
//             break;
//           default:
//             base[field] = d3.sum(values).toFixed(2);
//         }
//       }

//       result.push(base);
//     }

//     return result;
//   }

//   sortData(column: string): void {
//     if (this.sortColumn === column) {
//       this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
//     } else {
//       this.sortColumn = column;
//       this.sortDirection = 'asc';
//     }

//     this.aggregatedData.sort((a, b) => {
//       const valueA = a[column];
//       const valueB = b[column];

//       const comparison =
//         typeof valueA === 'number' && typeof valueB === 'number'
//           ? valueA - valueB
//           : valueA?.toString().localeCompare(valueB?.toString());

//       return this.sortDirection === 'asc' ? comparison : -comparison;
//     });
//   }

//   exportToExcel(): void {
//     const selectedCols = this.Table_columns.filter(col => this.selectedExportColumnsMap[col]);
//     if (!selectedCols.length) {
//       alert('Please select at least one column to export.');
//       return;
//     }

//     const exportData = this.aggregatedData.map(row => {
//       const filtered: any = {};
//       selectedCols.forEach(col => filtered[col] = row[col]);
//       return filtered;
//     });

//     const worksheet = XLSX.utils.json_to_sheet(exportData, { header: selectedCols });
//     worksheet['!cols'] = selectedCols.map(col => ({
//       wch: Math.max(col.length, ...exportData.map(r => r[col]?.toString()?.length || 0)) + 2
//     }));

//     const workbook = { Sheets: { Data: worksheet }, SheetNames: ['Data'] };
//     const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

//     FileSaver.saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'exported_data.xlsx');
//   }

//   getAggregatedValue(column: string): string {
//     if (!this.numericFields.includes(column)) return '';

//     const values = this.aggregatedData.map(row => +row[column]).filter(v => !isNaN(v));
//     const aggType = (this.aggregationFields[column] || '').toLowerCase();

//     switch (aggType) {
//       case 'sum':
//         return d3.sum(values).toFixed(2);
//       case 'avg':
//       case 'average':
//         return values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
//       case 'min':
//         return d3.min(values)?.toFixed(2) ?? '0.00';
//       case 'max':
//         return d3.max(values)?.toFixed(2) ?? '0.00';
//       case 'count':
//         return values.length.toString();
//       case 'countdistinct':
//       case 'count distinct':
//         return new Set(values).size.toString();
//       default:
//         return '';
//     }
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;

//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;

//     const chartConfig = this.chartIcons?.find(chart => chart.label === this.label);
//     if (!chartConfig) {
//       console.warn(`❌ No chart config found for label: ${this.label}`);
//     }

//     const payload: any = {
//       label: this.label,
//       Table_columns: this.data2,
//       aggregationFields: this.aggregationFields,
//       aggregationType: this.aggregationType,
//       uniqueIddata: this.uniqueId,
//       aggregationFieldKey: this.aggregationFieldKey,
//       selectchartfunction: true
//     };

//     (chartConfig?.fields || []).forEach((fieldKey: string) => {
//       const value = (this as any)[fieldKey];
//       if (value !== undefined) {
//         payload[fieldKey] = value;
//       } else {
//         console.warn(`⚠️ Field '${fieldKey}' not found in component`);
//       }
//     });

//     console.log('🟢 Emitting editClicked from handleClick:', payload);
//     this.editClicked.emit(payload);
//     console.log('------payload--------', payload);
//   }



//   hidethepage() {
//     this.onDeleteFromChild();
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false,
//     });
//     this.OnuniqueIdremove()
//   }
//   OnuniqueIdremove() {
//     this.deleteChart.emit(this.uniqueId);
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Table';
//     this.tableData = [];
//     this.aggregatedData = [];
//     this.Table_columns = [];
//     this.aggregationFields = {};
//     this.showCharts = true;
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//   }
// }
















// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   Input,
//   Output,
//   EventEmitter,
//   ViewChild,
//   ElementRef,
//   SimpleChanges,
//   OnChanges,
// } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Subscription } from 'rxjs';
// import * as d3 from 'd3';
// import * as XLSX from 'xlsx';
// import * as FileSaver from 'file-saver';
// import { CoreService } from 'src/app/services/core.service';
// import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// import { MaterialModule } from "src/app/material.module";

// export interface TableEditEvent {
//   label: string;
//   Table_columns: string[];
//   aggregationFields?: { [key: string]: string };
//   uniqueIddata: any;
//   aggregationType: any;
//   selectchartfunction: boolean;
//   tableData?: any[];        // ✅ Added
//   aggregatedData?: any[];   // ✅ Added
//   [key: string]: any;
// }

// export interface deleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-table',
//   standalone: true,
//   imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle, MaterialModule],
//   templateUrl: './table.component.html',
//   styleUrls: ['./table.component.scss'],
// })
// export class TableComponent implements OnInit, OnDestroy, OnChanges {
//   @Input() label: string = 'Table';
//   @Input() uniqueId: any = '';
//   @Input() Table_columns: string[] = [];
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() showCharts: boolean = true;
//   @Input() chartIcons: any[] = []; 
//   @Input() aggregationFieldKey: string = '';

//   @Output() editClicked = new EventEmitter<TableEditEvent>();
//   @Output() editClickeds = new EventEmitter<deleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<number>();

//   @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

//   tableData: any[] = [];
//   aggregatedData: any[] = [];
//   stringFields: string[] = [];
//   numericFields: string[] = [];
//   selectedExportColumnsMap: { [key: string]: boolean } = {};
//   aggregationType: string = '';
//   data2: any;

//   sortColumn: string = '';
//   sortDirection: 'asc' | 'desc' = 'asc';

//   private dataSubscription?: Subscription;

//   constructor(private coreService: CoreService) {}

//   ngOnInit(): void {
//     this.itchartdata();
//   }

//   itchartdata() {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe((data) => {
//       if (this.uniqueId === data.uniqueIddata) {
//         if (this.showCharts) this.showCharts = false;
//         this.data2 = data.Table_columns;
//         this.aggregationType = data.fields[0] || 'Count';

//         if (data?.data?.length) {
//           this.tableData = data.data;
//           this.aggregationFields = data.aggregation || {};

//           if (!this.Table_columns.length) {
//             this.Table_columns = Object.keys(this.tableData[0]);
//           }

//           this.detectFieldTypes();
//           this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);

//           this.Table_columns = [...this.stringFields, ...this.numericFields];
//           for (const col of this.Table_columns) {
//             this.selectedExportColumnsMap[col] = true;
//           }

//           // ✅ Emit automatically when data loads
//           this.emitTableUpdate();
//         }
//       }
//     });
//   }

//   ngOnChanges(changes: SimpleChanges): void {
//     if (changes['aggregationFields'] && this.tableData.length) {
//       this.aggregatedData = this.aggregateAndDeduplicate(this.tableData);
//       this.emitTableUpdate(); // ✅ Keep parent synced
//     }
//   }

//   getGrandTotal(column: string): string {
//     if (!this.numericFields.includes(column)) return '';

//     const values = this.aggregatedData.map(row => +row[column]).filter(v => !isNaN(v));
//     return d3.sum(values).toFixed(2);
//   }

//   detectFieldTypes(): void {
//     if (!this.tableData.length) return;
//     const sample = this.tableData[0];
//     this.stringFields = [];
//     this.numericFields = [];

//     for (const key of Object.keys(sample)) {
//       if (typeof sample[key] === 'number') {
//         this.numericFields.push(key);
//       } else {
//         this.stringFields.push(key);
//       }
//     }
//   }

//   aggregateAndDeduplicate(data: any[]): any[] {
//     const groupedMap = new Map<string, any[]>();

//     for (const row of data) {
//       const key = this.stringFields.map(f => row[f]).join('|');
//       if (!groupedMap.has(key)) groupedMap.set(key, []);
//       groupedMap.get(key)?.push(row);
//     }

//     const result: any[] = [];

//     for (const [key, group] of groupedMap.entries()) {
//       const base = this.stringFields.reduce((obj, f, i) => {
//         obj[f] = key.split('|')[i];
//         return obj;
//       }, {} as any);

//       for (const field of this.numericFields) {
//         const values = group.map(r => +r[field]).filter(v => !isNaN(v));
//         const aggType = (this.aggregationFields[field] || this.aggregationType).toLowerCase();

//         switch (aggType) {
//           case 'sum':
//             base[field] = d3.sum(values).toFixed(2);
//             break;
//           case 'avg':
//           case 'average':
//             base[field] = values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
//             break;
//           case 'min':
//             base[field] = d3.min(values)?.toFixed(2) ?? '0.00';
//             break;
//           case 'max':
//             base[field] = d3.max(values)?.toFixed(2) ?? '0.00';
//             break;
//           case 'count':
//             base[field] = values.length.toString();
//             break;
//           case 'countdistinct':
//           case 'count distinct':
//             base[field] = new Set(values).size.toString();
//             break;
//           default:
//             base[field] = d3.sum(values).toFixed(2);
//         }
//       }
//       result.push(base);
//     }

//     return result;
//   }

//   sortData(column: string): void {
//     if (this.sortColumn === column) {
//       this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
//     } else {
//       this.sortColumn = column;
//       this.sortDirection = 'asc';
//     }

//     this.aggregatedData.sort((a, b) => {
//       const valueA = a[column];
//       const valueB = b[column];

//       const comparison =
//         typeof valueA === 'number' && typeof valueB === 'number'
//           ? valueA - valueB
//           : valueA?.toString().localeCompare(valueB?.toString());

//       return this.sortDirection === 'asc' ? comparison : -comparison;
//     });
//   }

//   exportToExcel(): void {
//     const selectedCols = this.Table_columns.filter(col => this.selectedExportColumnsMap[col]);
//     if (!selectedCols.length) {
//       alert('Please select at least one column to export.');
//       return;
//     }

//     const exportData = this.aggregatedData.map(row => {
//       const filtered: any = {};
//       selectedCols.forEach(col => filtered[col] = row[col]);
//       return filtered;
//     });

//     const worksheet = XLSX.utils.json_to_sheet(exportData, { header: selectedCols });
//     worksheet['!cols'] = selectedCols.map(col => ({
//       wch: Math.max(col.length, ...exportData.map(r => r[col]?.toString()?.length || 0)) + 2
//     }));

//     const workbook = { Sheets: { Data: worksheet }, SheetNames: ['Data'] };
//     const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

//     FileSaver.saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'exported_data.xlsx');
//   }

//   getAggregatedValue(column: string): string {
//     if (!this.numericFields.includes(column)) return '';

//     const values = this.aggregatedData.map(row => +row[column]).filter(v => !isNaN(v));
//     const aggType = (this.aggregationFields[column] || '').toLowerCase();

//     switch (aggType) {
//       case 'sum':
//         return d3.sum(values).toFixed(2);
//       case 'avg':
//       case 'average':
//         return values.length ? (d3.sum(values) / values.length).toFixed(2) : '0.00';
//       case 'min':
//         return d3.min(values)?.toFixed(2) ?? '0.00';
//       case 'max':
//         return d3.max(values)?.toFixed(2) ?? '0.00';
//       case 'count':
//         return values.length.toString();
//       case 'countdistinct':
//       case 'count distinct':
//         return new Set(values).size.toString();
//       default:
//         return '';
//     }
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;

//     const chartConfig = this.chartIcons?.find(chart => chart.label === this.label);

//     const payload: TableEditEvent = {
//       label: this.label,
//       Table_columns: this.data2,
//       aggregationFields: this.aggregationFields,
//       aggregationType: this.aggregationType,
//       uniqueIddata: this.uniqueId,
//       aggregationFieldKey: this.aggregationFieldKey,
//       selectchartfunction: true,
//       tableData: this.tableData,             // ✅ Added
//       aggregatedData: this.aggregatedData,   // ✅ Added
//     };

//     (chartConfig?.fields || []).forEach((fieldKey: string) => {
//       const value = (this as any)[fieldKey];
//       if (value !== undefined) payload[fieldKey] = value;
//     });

//     this.editClicked.emit(payload);
//   }

//   hidethepage() {
//     this.onDeleteFromChild();
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false,
//     });
//     this.OnuniqueIdremove();
//   }

//   OnuniqueIdremove() {
//     this.deleteChart.emit(this.uniqueId);
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Table';
//     this.tableData = [];
//     this.aggregatedData = [];
//     this.Table_columns = [];
//     this.aggregationFields = {};
//     this.showCharts = true;
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//   }

//   // ✅ Helper to emit data updates automatically
//   private emitTableUpdate(): void {
//     const payload: TableEditEvent = {
//       label: this.label,
//       Table_columns: this.Table_columns,
//       aggregationFields: this.aggregationFields,
//       aggregationType: this.aggregationType,
//       uniqueIddata: this.uniqueId,
//       selectchartfunction: true,
//       tableData: this.tableData,
//       aggregatedData: this.aggregatedData,
//     };
//     this.editClicked.emit(payload);
//   }
// }