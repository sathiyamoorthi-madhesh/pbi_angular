import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CoreService } from '../../../services/core.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';

export interface ChartEditEvent {
  label: string;
  aggregationFieldKey: string;
  aggregationType: string;
  aggregationFields: { [key: string]: string };
  Card_value: string;
}
export interface deleteChartEdits {
  label: string;
}

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle]
})
export class CardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() showCharts: boolean = false;

  label = 'Card';
  aggregationFieldKey = '';
  aggregationType = '';
  aggregatedata: { [key: string]: string } = {};
  chartData: any[] = [];
  string_Card_value: string[] = [];
  numeric_Card_value: string[] = [];
  displayedColumns: string[] = [];

  private dataSubscription?: Subscription;

  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<deleteChartEdits>();

  constructor(private chartDataService: CoreService) {}

  ngOnInit(): void {
   this.itchartdata();
  }

  itchartdata(){
     if (this.showCharts === true) {
      this.showCharts = false;
    }
    this.subscribeToData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes) {
      this.processData();
    }
  }

  subscribeToData(): void {
    this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe(data => {
      if (data) {
        this.chartData = data.data || [];
        this.aggregatedata = data.aggregation || {};
        this.processData();
      }
    });
  }

  processData(): void {
    if (!this.chartData.length) return;

    const sample = this.chartData[0];
    this.string_Card_value = [];
    this.numeric_Card_value = [];

    for (const key of Object.keys(sample)) {
      const value = sample[key];
      if (typeof value === 'number') {
        this.numeric_Card_value.push(key);
      } else {
        this.string_Card_value.push(key);
      }
    }

    this.displayedColumns = [...this.string_Card_value, ...this.numeric_Card_value];
  }

  getAggregateValue(column: string): number | string {
    const isNumeric = this.numeric_Card_value.includes(column);
    const aggregation = this.aggregatedata[column] || (isNumeric ? 'Sum' : 'Count');
    const values = this.chartData.map(row => +row[column]).filter(v => !isNaN(v));

    switch (aggregation) {
      case 'Sum':
        return values.reduce((a, b) => a + b, 0).toFixed(2);
      case 'Average':
        return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '0';
      case 'Min':
        return values.length ? Math.min(...values).toFixed(2) : '';
      case 'Max':
        return values.length ? Math.max(...values).toFixed(2) : '';
      case 'Count':
        return this.chartData.length.toString();
      case 'Count Distinct':
        return new Set(values.map(v => v)).size;
      default:
        return isNumeric ? values.reduce((a, b) => a + b, 0).toFixed(2) : this.chartData.length.toString();
    }
  }

  getAggregateCards(): { field: string; value: any; label: string }[] {
    return this.displayedColumns.map(field => ({
      field,
      value: this.getAggregateValue(field),
      label: this.aggregatedata[field] || (this.numeric_Card_value.includes(field) ? 'Sum' : 'Count'),
    }));
  }

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.close-button') || target.closest('.example-handle')) return;

    this.editClicked.emit({
      label: this.label,
      aggregationFieldKey: this.aggregationFieldKey,
      aggregationType: this.aggregationType,
      aggregationFields: this.aggregatedata,
      Card_value: this.numeric_Card_value[0]
      ? this.getAggregateValue(this.numeric_Card_value[0]).toString()
      : '0'
    });
  }

  onDeleteFromChild(): void {
    this.chartData = [];
    this.aggregatedata = {};
    this.displayedColumns = [];
    this.numeric_Card_value = [];
    this.string_Card_value = [];
    this.aggregationFieldKey = '';
    this.aggregationType = '';
    this.showCharts = true;
    this.editClickeds.emit({
      label: this.label,})
  }
  
  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }
}
