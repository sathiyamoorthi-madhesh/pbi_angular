import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  ViewChild,
  ElementRef,
  booleanAttribute
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CoreService } from '../../../services/core.service';
import { FormsModule } from '@angular/forms';

export interface ChartEditEvent {
  label: string;
  aggregationFieldKey: string;
  aggregationType: string;
  Stackedbar_y_Axis: string[];
  Stackedbar_x_Axis: string[];
  Stackedbar_legend: string[];
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-stackedbar',
  standalone: true,
  templateUrl: './stackedbar.component.html',
  styleUrls: ['./stackedbar.component.scss'],
  imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
})
export class StackedbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() label: string = 'Stackedbar';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() Stackedbar_y_Axis: string[] = [];
  @Input() Stackedbar_x_Axis: string[] = [];
  @Input() Stackedbar_legend: string[] = [];
  @Input() uniqueId: any = '';
  @Input({ transform: booleanAttribute }) showCharts: boolean = true;
  @Input() title: string = '';
  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<number>();
  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;

  chartData: any[] = [];
  aggregatedData: any[] = [];
  aggregationType: string = 'Count';
  aggregationFieldKey: string = '';
  private dataSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private hasViewInitialized = false;
  data2: any;
  data3: any;
  data4: any;
  activedata: any[] = [];
  private highlightSet: Set<string> = new Set(); // For highlighting based on activedata

  xAxisFormatters: { [field: string]: (value: any) => string } = {};

  constructor(private coreService: CoreService) {}

  ngOnInit(): void {
    this.itchartdata();
    console.log('Chart title:', this.title);
  }

  ngOnChanges(): void {
    if (this.chartData?.length) {
      this.aggregatedData = this.aggregateData(this.chartData);
      if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
    }
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    if (this.chartContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
    if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  itchartdata(): void {
    this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
      if (!data || this.uniqueId !== data.uniqueIddata) return;

      this.data2 = data.Stackedbar_x_Axis ?? [];
      this.data3 = data.Stackedbar_y_Axis ?? [];
      this.data4 = data.Stackedbar_legend ?? [];
      this.showCharts = false;
      this.chartData = data.data ?? [];
      this.aggregationFields = data.aggregationFields ?? {};
      this.aggregationType = data.fields[0] ?? 'Count';
      this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

      this.Stackedbar_y_Axis = (data.Stackedbar_y_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.Stackedbar_x_Axis = (data.Stackedbar_x_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.Stackedbar_legend = (data.Stackedbar_legend ?? []).map((f: any) => f.split('.')[0]);

      // Handle highlighting based on activedata
      this.highlightSet.clear();
      if (data.activedata?.length && this.Stackedbar_y_Axis.length) {
        data.activedata.forEach((row: any) => {
          const groupKey = this.getKey(row, this.Stackedbar_y_Axis);
          this.highlightSet.add(groupKey);
        });
      }

      this.aggregatedData = this.aggregateData(this.chartData);
      if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
      this.getSummaryStats(this.aggregatedData);
    });
  }

  private getKey(d: any, fields: string[]): string {
    return fields.map(f => d[f] ?? '').join(' | ');
  }

  private aggregateData(data: any[]): any[] {
    if (!data?.length) return [];

    const grouped = d3.groups(data, d => this.getKey(d, this.Stackedbar_y_Axis));
    const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.Stackedbar_legend))));

    return grouped.map(([groupKey, records]) => {
      const row: any = { group: groupKey, isHighlighted: this.highlightSet.has(groupKey) };
      this.Stackedbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
      for (const legend of legendKeys) {
        const subRecords = records.filter(r => this.getKey(r, this.Stackedbar_legend) === legend);
        row[legend] = this.aggregateValues(subRecords, this.Stackedbar_x_Axis);
      }
      return row;
    });
  }

  private aggregateValues(records: any[], fields: string[]): number {
    const values = records.flatMap(r => fields.map(f => +r[f] || 0)).filter(v => !isNaN(v));
    switch (this.aggregationType) {
      case 'Sum': return d3.sum(values);
      case 'Average': return d3.mean(values) ?? 0;
      case 'Count': return records.length;
      case 'Count Distinct': return new Set(values).size;
      case 'Min': return d3.min(values) ?? 0;
      case 'Max': return d3.max(values) ?? 0;
      default: return d3.sum(values);
    }
  }

  private formatYAxisLabel(field: string, value: any): string {
    return this.xAxisFormatters[field]?.(value) ?? String(value);
  }

  getGroupLabelLines(d: any): string[] {
    return this.Stackedbar_y_Axis.map((axis: any, i: number) => {
      const value = d[`_x${i}`] ?? '';
      const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
      return this.formatYAxisLabel(fieldName, value);
    });
  }

  showSwalTable(d: any): void {
    // Filter rows where y-axis group matches
    const fullData = this.chartData.filter(
      (row) => this.getKey(row, this.Stackedbar_y_Axis) === d.group
    );

    // Get unique y-axis values
    const uniqueValues = [...new Set(fullData.map((row) => this.getKey(row, this.Stackedbar_y_Axis)))];

    // Format as { yAxisFieldName: [data1, data2, ...] }
    const formattedData = {
      [this.Stackedbar_y_Axis.join('_')]: uniqueValues
    };

    console.log('----------formatted y-axis data----------------', formattedData);

    // Send formatted data to service
    this.coreService.Onpostrelationdata(formattedData);

    // Update activedata and refresh
    this.activedata = [...fullData];
    this.itchartdata();
  }

  renderChart(data: any[]): void {
    if (!this.chartContainer) return;

    const container = this.chartContainer.nativeElement;
    d3.select(container).selectAll('*').remove();

    if (!data?.length || !this.Stackedbar_x_Axis?.length || !this.Stackedbar_y_Axis?.length) {
      d3.select(container)
        .append('div')
        .style('color', 'red')
        .style('text-align', 'center')
        .style('padding', '20px')
        .style('font-size', '16px')
        .text('Please select both X-Axis and Y-Axis fields to render the chart.');
      return;
    }

    const barHeight = 40;
    const visibleHeight = 500;
    const outerWidth = container.offsetWidth || 800;
    const longestGroup = d3.max(data, d => d.group?.length) ?? 10;
    const estimatedLabelWidth = longestGroup * 7.5;
    const margin = {
      top: 40,
      right: 200,
      bottom: 80,
      left: Math.max(180, estimatedLabelWidth + 40)
    };
    const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
    const width = outerWidth - margin.left - margin.right;
    const height = fullChartHeight - margin.top - margin.bottom;

    const keys = Object.keys(data[0] || {})
      .filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));
    const stack = d3.stack<any>().keys(keys).value((d, key) => d[key] || 0);
    const series = stack(data);

    const y = d3.scaleBand()
      .domain(data.map(d => d.group))
      .range([0, height])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const xMax = d3.max(data, d => d3.sum(keys.map(k => d[k] || 0))) ?? 0;
    const x = d3.scaleLinear()
      .domain([0, xMax])
      .nice()
      .range([0, width]);

    const color = d3.scaleOrdinal<string>()
      .domain(keys)
      .range(d3.schemeSet2);

    const tooltip = this.createTooltip(container);

    d3.select(container)
      .append('div')
      .style('text-align', 'center')
      .style('font-weight', 'bold')
      .style('font-size', '16px')
      .style('margin-bottom', '4px')
      .text(this.label || 'Stackedbar Chart');

    let legendPage = 0;
    const legendDiv = d3.select(container)
      .append('div')
      .style('position', 'sticky')
      .style('top', '0px')
      .style('background', '#fff')
      .style('z-index', '10')
      .style('padding', '6px 0 2px 10px');

    const renderLegend = () => {
      legendDiv.selectAll('*').remove();
      const chartWidth = outerWidth - 50;
      const itemsPerPage = Math.max(1, Math.floor(chartWidth / 140));
      const currentKeys = keys.slice(legendPage * itemsPerPage, (legendPage + 1) * itemsPerPage);

      if (legendPage > 0) {
        legendDiv.append('span')
          .style('margin-right', '10px')
          .style('cursor', 'pointer')
          .style('font-weight', 'bold')
          .text('<')
          .on('click', () => {
            legendPage--;
            renderLegend();
          });
      }

      const legendItems = legendDiv.selectAll('.legend-item')
        .data(currentKeys)
        .enter()
        .append('span')
        .attr('class', 'legend-item')
        .style('display', 'inline-block')
        .style('margin-right', '20px');

      legendItems.append('span')
        .style('display', 'inline-block')
        .style('width', '14px')
        .style('height', '14px')
        .style('background-color', d => color(d))
        .style('margin-right', '6px');

      legendItems.append('span')
        .style('font-size', '12px')
        .text(d => d);

      if ((legendPage + 1) * itemsPerPage < keys.length) {
        legendDiv.append('span')
          .style('margin-left', '10px')
          .style('cursor', 'pointer')
          .style('font-weight', 'bold')
          .text('>')
          .on('click', () => {
            legendPage++;
            renderLegend();
          });
      }
    };

    if (keys.length) renderLegend();

    const scrollContainer = d3.select(container)
      .append('div')
      .style('height', `${visibleHeight}px`)
      .style('overflow-y', 'auto')
      .style('overflow-x', 'hidden')
      .style('position', 'relative');

    const scrollSvg = scrollContainer
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', fullChartHeight);

    const chart = scrollSvg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    chart.selectAll('g.layer')
      .data(series)
      .join('g')
      .attr('class', 'layer')
      .attr('fill', d => color(d.key) as string)
      .selectAll('rect')
      .data(d => d.map(entry => ({ ...entry, key: d.key })))
      .join('rect')
      .attr('y', d => y(d.data.group)!)
      .attr('x', d => x(d[0]))
      .attr('width', d => x(d[1]) - x(d[0]))
      .attr('height', y.bandwidth())
      .attr('fill', d => d.data.isHighlighted ? 'red' : color(d.key)) // Highlight based on isHighlighted
      .on('mouseover', () => tooltip.style('opacity', 1))
      .on('mousemove', (event, d) => {
        const [mouseX, mouseY] = d3.pointer(event, container);
        const yLabel = this.Stackedbar_y_Axis
          .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
          .join('<br>');
        const value = d.data[d.key];
        tooltip.html(`
          ${yLabel}<br>
          <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
        `)
          .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
          .style('top', `${Math.min(mouseY, visibleHeight - 50)}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (_, d) => this.showSwalTable(d.data));

    chart.append('g')
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .selectAll('text')
      .style('font-size', '12px')
      .style('text-anchor', 'end')
      .each(function (_, i) {
        const self = d3.select(this);
        const text = self.text();
        const maxWidth = margin.left - 30;
        if ((self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
          let truncated = text;
          while (truncated.length > 0 &&
                (self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
            truncated = truncated.slice(0, -1);
            self.text(truncated + '...');
          }
        }
        self.append('title').text(text);
      });

    scrollSvg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -fullChartHeight / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(this.Stackedbar_y_Axis.join(' / '));

    const xAxisSvg = d3.select(container)
      .append('svg')
      .attr('width', outerWidth)
      .attr('height', margin.bottom)
      .style('display', 'block');

    xAxisSvg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisBottom(x).ticks(Math.max(Math.floor(width / 80), 2)).tickFormat(d3.format('~s')))
      .selectAll('text')
      .style('font-size', '12px');

    xAxisSvg.append('text')
      .attr('transform', `translate(${margin.left + width / 2},${margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(`${this.aggregationType} (${this.Stackedbar_x_Axis.join(' + ')})`);
  }

  private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
    return d3.select(container)
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('padding', '6px')
      .style('background', 'rgba(0, 0, 0, 0.7)')
      .style('margin-left', '30px')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('opacity', 0)
      .style('z-index', '999');
  }

  private emitEditEvent(): void {
    this.editClicked.emit({
      label: this.label,
      aggregationFieldKey: this.aggregationFieldKey,
      aggregationType: this.aggregationType,
      Stackedbar_y_Axis: this.data3 ?? [],
      Stackedbar_x_Axis: this.data2 ?? [],
      Stackedbar_legend: this.data4 ?? [],
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  getSummaryStats(data: any[]): void {
    if (!data?.length) return;
    const keys = Object.keys(data[0]).filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));
    const values = data.flatMap(d => keys.map(k => +d[k] || 0));
    const summary = {
      total: d3.sum(values),
      min: d3.min(values) ?? 0,
      max: d3.max(values) ?? 0,
      avg: (d3.mean(values) || 0).toFixed(2),
    };
    console.log(`${this.label} Summary:`, summary);
  }

  onEdit(): void {
    this.emitEditEvent();
  }

  onDeleteFromChild(): void {
    this.label = 'Stackedbar';
    this.aggregationFields = {};
    this.Stackedbar_y_Axis = [];
    this.Stackedbar_x_Axis = [];
    this.Stackedbar_legend = [];
    this.aggregationType = '';
    this.chartData = [];
    this.aggregatedData = [];
    this.showCharts = true;
    this.highlightSet.clear();
    this.activedata = [];
    this.editClickeds.emit({
      label: this.label,
      selectchartfunction: false
    });
    this.deleteChart.emit(this.uniqueId);
    if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
    this.getSummaryStats(this.aggregatedData);
  }

  hidethepage(): void {
    this.onDeleteFromChild();
  }

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) return;
    this.emitEditEvent();
  }
}



























// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, OnChanges,
//   ViewChild, ElementRef, booleanAttribute
// } from '@angular/core';
// import * as d3 from 'd3';
// import { Subscription } from 'rxjs';
// import { CommonModule } from '@angular/common';
// import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// import { CoreService } from 'src/app/services/core.service';
// import { FormsModule } from '@angular/forms';

// export interface ChartEditEvent {
//   label: string;
//   aggregationFieldKey: string;
//   aggregationType: string;
//   Stackedbar_y_Axis: string[];
//   Stackedbar_x_Axis: string[];
//   Stackedbar_legend: string[];
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-stackedbar',
//   standalone: true,
//   templateUrl: './stackedbar.component.html',
//   styleUrls: ['./stackedbar.component.scss'],
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
// })
// export class StackedbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//   @Input() label: string = 'Stackedbar';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() Stackedbar_y_Axis: string[] = [];
//   @Input() Stackedbar_x_Axis: string[] = [];
//   @Input() Stackedbar_legend: string[] = [];
//   @Input() uniqueId: any = '';
//   @Input({ transform: booleanAttribute }) showCharts: boolean = true;
//   @Input() title: string = '';
//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<number>();
//   @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;

//   chartData: any[] = [];
//   aggregatedData: any[] = [];
//   aggregationType: string = 'Count';
//   aggregationFieldKey: string = '';
//   private dataSubscription?: Subscription;
//   private resizeObserver?: ResizeObserver;
//   private hasViewInitialized = false;
//   data2: any;
//   data3: any;
//   data4: any;

//   xAxisFormatters: { [field: string]: (value: any) => string } = {};

//   constructor(private coreService: CoreService) {}

//   ngOnInit(): void {
//     this.itchartdata();
//     console.log('Chart title:', this.title);
//   }

//   ngOnChanges(): void {
//     if (this.chartData?.length) {
//       this.aggregatedData = this.aggregateData(this.chartData);
//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//     }
//   }

//   itchartdata(): void {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//       if (!data || this.uniqueId !== data.uniqueIddata) return;

//       this.data2 = data.Stackedbar_x_Axis ?? [];
//       this.data3 = data.Stackedbar_y_Axis ?? [];
//       this.data4 = data.Stackedbar_legend ?? [];
//       this.showCharts = false;
//       this.chartData = data.data ?? [];
//       this.aggregationFields = data.aggregationFields ?? {};
//       this.aggregationType = data.fields[0] ?? 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

//       this.Stackedbar_y_Axis = (data.Stackedbar_y_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.Stackedbar_x_Axis = (data.Stackedbar_x_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.Stackedbar_legend = (data.Stackedbar_legend ?? []).map((f: any) => f.split('.')[0]);

//       this.aggregatedData = this.aggregateData(this.chartData);
//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//       this.getSummaryStats(this.aggregatedData);
//     });
//   }

//   ngAfterViewInit(): void {
//     this.hasViewInitialized = true;
//     if (this.chartContainer?.nativeElement) {
//       this.resizeObserver = new ResizeObserver(() => {
//         if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//       });
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//   }

//   private getKey(d: any, fields: string[]): string {
//     return fields.map(f => d[f] ?? '').join(' | ');
//   }

//   private aggregateData(data: any[]): any[] {
//     if (!data?.length) return [];

//     const grouped = d3.groups(data, d => this.getKey(d, this.Stackedbar_y_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.Stackedbar_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.Stackedbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.Stackedbar_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.Stackedbar_x_Axis);
//       }
//       return row;
//     });
//   }

//   private aggregateValues(records: any[], fields: string[]): number {
//     const values = records.flatMap(r => fields.map(f => +r[f] || 0)).filter(v => !isNaN(v));
//     switch (this.aggregationType) {
//       case 'Sum': return d3.sum(values);
//       case 'Average': return d3.mean(values) ?? 0;
//       case 'Count': return records.length;
//       case 'Count Distinct': return new Set(values).size;
//       case 'Min': return d3.min(values) ?? 0;
//       case 'Max': return d3.max(values) ?? 0;
//       default: return d3.sum(values);
//     }
//   }

//   private formatYAxisLabel(field: string, value: any): string {
//     return this.xAxisFormatters[field]?.(value) ?? String(value);
//   }

//   getGroupLabelLines(d: any): string[] {
//     return this.Stackedbar_y_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       return this.formatYAxisLabel(fieldName, value);
//     });
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer) return;

//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();

//     if (!data?.length || !this.Stackedbar_x_Axis?.length || !this.Stackedbar_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('color', 'red')
//         .style('text-align', 'center')
//         .style('padding', '20px')
//         .style('font-size', '16px')
//         .text('Please select both X-Axis and Y-Axis fields to render the chart.');
//       return;
//     }

//     const barHeight = 40;
//     const visibleHeight = 500;
//     const outerWidth = container.offsetWidth || 800;
//     const longestGroup = d3.max(data, d => d.group?.length) ?? 10;
//     const estimatedLabelWidth = longestGroup * 7.5;
//     const margin = {
//       top: 40,
//       right: 200,
//       bottom: 80,
//       left: Math.max(180, estimatedLabelWidth + 40)
//     };
//     const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
//     const width = outerWidth - margin.left - margin.right;
//     const height = fullChartHeight - margin.top - margin.bottom;

//     const keys = Object.keys(data[0] || {})
//       .filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const stack = d3.stack<any>().keys(keys).value((d, key) => d[key] || 0);
//     const series = stack(data);

//     const y = d3.scaleBand()
//       .domain(data.map(d => d.group))
//       .range([0, height])
//       .paddingInner(0.2)
//       .paddingOuter(0.1);

//     const xMax = d3.max(data, d => d3.sum(keys.map(k => d[k] || 0))) ?? 0;
//     const x = d3.scaleLinear()
//       .domain([0, xMax])
//       .nice()
//       .range([0, width]);

//     const color = d3.scaleOrdinal<string>()
//       .domain(keys)
//       .range(d3.schemeSet2);

//     const tooltip = this.createTooltip(container);

//     d3.select(container)
//       .append('div')
//       .style('text-align', 'center')
//       .style('font-weight', 'bold')
//       .style('font-size', '16px')
//       .style('margin-bottom', '4px')
//       .text(this.label || 'Stackedbar Chart');

//     let legendPage = 0;
//     const legendDiv = d3.select(container)
//       .append('div')
//       .style('position', 'sticky')
//       .style('top', '0px')
//       .style('background', '#fff')
//       .style('z-index', '10')
//       .style('padding', '6px 0 2px 10px');

//     const renderLegend = () => {
//       legendDiv.selectAll('*').remove();
//       const chartWidth = outerWidth - 50;
//       const itemsPerPage = Math.max(1, Math.floor(chartWidth / 140));
//       const currentKeys = keys.slice(legendPage * itemsPerPage, (legendPage + 1) * itemsPerPage);

//       if (legendPage > 0) {
//         legendDiv.append('span')
//           .style('margin-right', '10px')
//           .style('cursor', 'pointer')
//           .style('font-weight', 'bold')
//           .text('<')
//           .on('click', () => {
//             legendPage--;
//             renderLegend();
//           });
//       }

//       const legendItems = legendDiv.selectAll('.legend-item')
//         .data(currentKeys)
//         .enter()
//         .append('span')
//         .attr('class', 'legend-item')
//         .style('display', 'inline-block')
//         .style('margin-right', '20px');

//       legendItems.append('span')
//         .style('display', 'inline-block')
//         .style('width', '14px')
//         .style('height', '14px')
//         .style('background-color', d => color(d))
//         .style('margin-right', '6px');

//       legendItems.append('span')
//         .style('font-size', '12px')
//         .text(d => d);

//       if ((legendPage + 1) * itemsPerPage < keys.length) {
//         legendDiv.append('span')
//           .style('margin-left', '10px')
//           .style('cursor', 'pointer')
//           .style('font-weight', 'bold')
//           .text('>')
//           .on('click', () => {
//             legendPage++;
//             renderLegend();
//           });
//       }
//     };

//     if (keys.length) renderLegend();

//     const scrollContainer = d3.select(container)
//       .append('div')
//       .style('height', `${visibleHeight}px`)
//       .style('overflow-y', 'auto')
//       .style('overflow-x', 'hidden')
//       .style('position', 'relative');

//     const scrollSvg = scrollContainer
//       .append('svg')
//       .attr('width', outerWidth)
//       .attr('height', fullChartHeight);

//     const chart = scrollSvg.append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     chart.selectAll('g.layer')
//       .data(series)
//       .join('g')
//       .attr('class', 'layer')
//       .attr('fill', d => color(d.key) as string)
//       .selectAll('rect')
//       .data(d => d.map(entry => ({ ...entry, key: d.key })))
//       .join('rect')
//       .attr('y', d => y(d.data.group)!)
//       .attr('x', d => x(d[0]))
//       .attr('width', d => x(d[1]) - x(d[0]))
//       .attr('height', y.bandwidth())
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const yLabel = this.Stackedbar_y_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         const value = d.data[d.key];
//         tooltip.html(`
//           ${yLabel}<br>
//           <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//         `)
//           .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
//           .style('top', `${Math.min(mouseY, visibleHeight - 50)}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.emitEditEvent());

//     chart.append('g')
//       .call(d3.axisLeft(y).tickSizeOuter(0))
//       .selectAll('text')
//       .style('font-size', '12px')
//       .style('text-anchor', 'end')
//       .each(function (_, i) {
//         const self = d3.select(this);
//         const text = self.text();
//         const maxWidth = margin.left - 30;
//         if ((self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//           let truncated = text;
//           while (truncated.length > 0 &&
//                 (self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//             truncated = truncated.slice(0, -1);
//             self.text(truncated + '...');
//           }
//         }
//         self.append('title').text(text);
//       });

//     scrollSvg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -fullChartHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(this.Stackedbar_y_Axis.join(' / '));

//     const xAxisSvg = d3.select(container)
//       .append('svg')
//       .attr('width', outerWidth)
//       .attr('height', margin.bottom)
//       .style('display', 'block');

//     xAxisSvg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisBottom(x).ticks(Math.max(Math.floor(width / 80), 2)).tickFormat(d3.format('~s')))
//       .selectAll('text')
//       .style('font-size', '12px');

//     xAxisSvg.append('text')
//       .attr('transform', `translate(${margin.left + width / 2},${margin.bottom - 5})`)
//       .style('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(`${this.aggregationType} (${this.Stackedbar_x_Axis.join(' + ')})`);
//   }

//   private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
//     return d3.select(container)
//       .append('div')
//       .attr('class', 'd3-tooltip')
//       .style('position', 'absolute')
//       .style('padding', '6px')
//       .style('background', 'rgba(0, 0, 0, 0.7)')
//       .style('margin-left', '30px')
//       .style('color', '#fff')
//       .style('pointer-events', 'none')
//       .style('border-radius', '4px')
//       .style('font-size', '12px')
//       .style('opacity', 0)
//       .style('z-index', '999');
//   }

//   private emitEditEvent(): void {
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       Stackedbar_y_Axis: this.data3 ?? [],
//       Stackedbar_x_Axis: this.data2 ?? [],
//       Stackedbar_legend: this.data4 ?? [],
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   getSummaryStats(data: any[]): void {
//     if (!data?.length) return;
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const values = data.flatMap(d => keys.map(k => +d[k] || 0));
//     const summary = {
//       total: d3.sum(values),
//       min: d3.min(values) ?? 0,
//       max: d3.max(values) ?? 0,
//       avg: (d3.mean(values) || 0).toFixed(2),
//     };
//     console.log(`${this.label} Summary:`, summary);
//   }

//   onEdit(): void {
//     this.emitEditEvent();
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Stackedbar';
//     this.aggregationFields = {};
//     this.Stackedbar_y_Axis = [];
//     this.Stackedbar_x_Axis = [];
//     this.Stackedbar_legend = [];
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false
//     });
//     this.deleteChart.emit(this.uniqueId);
//     if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//     this.getSummaryStats(this.aggregatedData);
//   }

//   hidethepage(): void {
//     this.onDeleteFromChild();
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//     this.emitEditEvent();
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }
// }



//   import {
//     Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, OnChanges,
//     ViewChild, ElementRef
//   } from '@angular/core';
//   import * as d3 from 'd3';
//   import { Subscription } from 'rxjs';
//   import { CommonModule } from '@angular/common';
//   import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
//   import { CoreService } from 'src/app/services/core.service';
//   import { FormsModule } from '@angular/forms';

//   export interface ChartEditEvent {
//     label: string;
//     aggregationFieldKey: string;
//     aggregationType: string;
//     Stackedbar_y_Axis: string[];
//     Stackedbar_x_Axis: string[];
//     Stackedbar_legend: string[];
//     uniqueIddata:any,
//     aggregationFields: { [key: string]: string };
//     selectchartfunction:boolean;
//   }
//   export interface deleteChartEdits {
//     label: string;
//     selectchartfunction:boolean;
//   }

//   @Component({
//     selector: 'app-stackedbar',
//     standalone: true,
//     templateUrl: './stackedbar.component.html',
//     styleUrls: ['./stackedbar.component.scss'],
//     imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
//   })
//   export class StackedbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//     @Input() label: string = 'Stackedbar';
//     @Input() aggregationFields: { [key: string]: string } = {};
//     @Input() Stackedbar_y_Axis: string[] = [];
//     @Input() Stackedbar_x_Axis: string[] = [];
//     @Input() Stackedbar_legend: string[] = [];
//     @Input() uniqueId: any = '';
//     @Input() showCharts: boolean = true;
//     @Input() title: string = '';
//     @Output() editClicked = new EventEmitter<ChartEditEvent>();
//     @Output() editClickeds = new EventEmitter<deleteChartEdits>();
//     @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
//     @Output() deleteChart = new EventEmitter<number>();

//     chartData: any[] = [];
//     aggregatedData: any[] = [];
//     aggregationType: string = 'Count';
//     aggregationFieldKey: string = '';
//     private dataSubscription?: Subscription;
//     private resizeObserver?: ResizeObserver;
//     private hasViewInitialized = false;

//     xAxisFormatters: { [field: string]: (value: any) => string } = {};

//     constructor(private coreService: CoreService) { }

//     ngOnInit(): void {
//       this.itchartdata();
//       console.log('the function of title',this.title,'--------ok-------------');
//     }

//     itchartdata(){
//       this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//         if (this.uniqueId === data.uniqueIddata) {
//         this.showCharts = false;
//         this.chartData = data.data || [];
//         this.aggregationFields = data.aggregationFields || {};
//         this.aggregationType = data.aggregation || 'Count';
//         this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] || '';

//         this.Stackedbar_y_Axis = (data.Stackedbar_y_Axis || []).map((f: any) => f.split('.')[0]);
//         this.Stackedbar_x_Axis = (data.Stackedbar_x_Axis || []).map((f: any) => f.split('.')[0]);
//         this.Stackedbar_legend = (data.Stackedbar_legend || []).map((f: any) => f.split('.')[0]);

//         this.aggregatedData = this.aggregateData(this.chartData);
//         if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//         this.getSummaryStats(this.aggregatedData);
//         }
//       });
//     }

//     ngAfterViewInit(): void {
//       this.hasViewInitialized = true;
//       this.resizeObserver = new ResizeObserver(() => {
//         if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//       });
//       if (this.chartContainer?.nativeElement) {
//         this.resizeObserver.observe(this.chartContainer.nativeElement);
//       }
//       if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//     }

//     ngOnChanges(): void {
//       if (this.chartData?.length) {
//         this.renderChart(this.chartData);
//       }
//     }

//     private getKey(d: any, fields: string[]): string {
//       return fields.map(f => d[f]).join(' | ');
//     }

//     private aggregateData(data: any[]): any[] {
//       const grouped = d3.groups(data, d => this.getKey(d, this.Stackedbar_y_Axis));
//       const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.Stackedbar_legend))));

//       return grouped.map(([groupKey, records]) => {
//         const row: any = { group: groupKey };
//         this.Stackedbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0][f]);

//         for (const legend of legendKeys) {
//           const subRecords = records.filter(r => this.getKey(r, this.Stackedbar_legend) === legend);
//           row[legend] = this.aggregateValues(subRecords, this.Stackedbar_x_Axis);
//         }

//         return row;
//       });
//     }

//     private aggregateValues(records: any[], fields: string[]): number {
//       const values = records.flatMap(r => fields.map(f => +r[f])).filter(v => !isNaN(v));
//       switch (this.aggregationType) {
//         case 'Sum': return d3.sum(values);
//         case 'Average': return d3.mean(values) ?? 0;
//         case 'Count': return records.length;
//         case 'Count Distinct': return new Set(values).size;
//         case 'Min': return d3.min(values) ?? 0;
//         case 'Max': return d3.max(values) ?? 0;
//         default: return d3.sum(values);
//       }
//     }

//   getGroupLabelLines(d: any): string[] {
//     return this.Stackedbar_y_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       // Add field name to the last line
//       if (i === this.Stackedbar_y_Axis.length - 1) {
//         return `${value} (${axis})`;
//       }
//       return `${value}`;
//     });
//   }



//   renderChart(data: any[]): void {
//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();
    
//     // ==== Axis Field Check ====
//     if (!this.Stackedbar_x_Axis?.length || !this.Stackedbar_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('color', 'red')
//         .style('text-align', 'center')
//         .style('padding', '20px')
//         .style('font-size', '16px')
//         .text('Please select both X-Axis and Y-Axis fields to render the chart.');
//       return;
//     }

//     // ==== Core Layout Constants ====
//     const barHeight = 40;
//     const visibleHeight = 500;
//     const outerWidth = container.offsetWidth;
//     const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);

//     const longestGroup = d3.max(data, d => d.group.length) ?? 10;
//     const estimatedLabelWidth = longestGroup * 7.5;
//     const margin = {
//       top: 40,
//       right: 200,
//       bottom: 80,
//       left: Math.max(180, estimatedLabelWidth + 40)
//     };

//     const width = outerWidth - margin.left - margin.right;
//     const height = fullChartHeight - margin.top - margin.bottom;

//     // ==== Stack & Keys ====
//     const keys = Object.keys(data[0])
//       .filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const stack = d3.stack<any>().keys(keys).value((d, key) => d[key] || 0);
//     const series = stack(data);
    
//     // ==== Scales ====
//     const y = d3.scaleBand()
//       .domain(data.map(d => d.group))
//       .range([0, height])
//       .paddingInner(0.2)
//       .paddingOuter(0.1);

//       const xMax = d3.max(data, d => d3.sum(keys.map(k => d[k] || 0))) ?? 0;
//       const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, width]);
      
//     const color = d3.scaleOrdinal<string, string>()
//     .domain(keys)
//       .range(d3.schemeSet2);

//       const tooltip = this.createTooltip(container);

//       // ==== Title ====
//       d3.select(container)
//       .append('div')
//       .style('text-align', 'center')
//       .style('font-weight', 'bold')
//       .style('font-size', '16px')
//       .style('margin-bottom', '4px')
//       .text(this.label || 'Stackedbar Chart');
      
//       // ==== Fixed Paginated Legend (Top) ====
//       let legendPage = 0;

//       const legendDiv = d3.select(container)
//       .append('div')
//       .style('position', 'sticky')
//       .style('top', '0px')
//       .style('background', '#fff')
//       .style('z-index', '10')
//       .style('padding', '6px 0 2px 10px');

//       const renderLegend = () => {
//       legendDiv.selectAll('*').remove();
      
//       const chartWidth = outerWidth - 50;
//       const itemsPerPage = Math.max(1, Math.floor(chartWidth / 140));
//       const currentKeys = keys.slice(
//         legendPage * itemsPerPage,
//         (legendPage + 1) * itemsPerPage
//       );
      
//       if (legendPage > 0) {
//         legendDiv.append('span')
//           .style('margin-right', '10px')
//           .style('cursor', 'pointer')
//           .style('font-weight', 'bold')
//           .style('margin-rigth','10px')
//           .text('<')
//           .on('click', () => {
//             legendPage--;
//             renderLegend();
//           });
//       }
//       const legendItems = legendDiv.selectAll('.legend-item')
//       .data(currentKeys)
//         .enter()
//         .append('span')
//         .attr('class', 'legend-item')
//         .style('display', 'inline-block')
//         .style('margin-right', '20px');
        
//         legendItems.append('span')
//         .style('display', 'inline-block')
//         .style('width', '14px')
//         .style('height', '14px')
//         .style('background-color', d => color(d))
//         .style('margin-right', '6px');
        
//       legendItems.append('span')
//       .style('font-size', '12px')
//         .text(d => d);
        
//         // Previous button
        
//       // Next button
//       if ((legendPage + 1) * itemsPerPage < keys.length) {
//         legendDiv.append('span')
//         .style('margin-left', '10px')
//           .style('cursor', 'pointer')
//           .style('font-weight', 'bold')
//           .text('>')
//           .on('click', () => {
//             legendPage++;
//             renderLegend();
//           });
//       }
//     };

//     renderLegend(); // Initial render

//     // ==== Scrollable Chart Container ====
//     const scrollContainer = d3.select(container)
//     .append('div')
//       .style('height', `${visibleHeight}px`)
//       .style('overflow-y', 'auto')
//       .style('overflow-x', 'hidden')
//       .style('position', 'relative');

//     const scrollSvg = scrollContainer
//       .append('svg')
//       .attr('width', outerWidth)
//       .attr('height', fullChartHeight);
      
//       const chart = scrollSvg.append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);
      
//       // ==== Draw Stackedbars ====
//     chart.selectAll('g.layer')
//     .data(series)
//     .join('g')
//     .attr('class', 'layer')
//     .attr('fill', d => color(d.key) as string)
//       .selectAll('rect')
//       .data(d => d.map(entry => ({ ...entry, key: d.key })))
//       .join('rect')
//       .attr('y', d => y(d.data.group)!)
//       .attr('x', d => x(d[0]))
//       .attr('width', d => x(d[1]) - x(d[0]))
//       .attr('height', y.bandwidth())
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabel = this.Stackedbar_y_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         const value = d.data[d.key];
//         tooltip.html(`
//           ${xLabel}<br>
//           <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//         `)
//         .style('left', `${mouseX + 20}px`)
//           .style('top', `${mouseY}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.onEdit());
      
//     // ==== Y Axis ====
//     chart.append('g')
//     .call(d3.axisLeft(y).tickSizeOuter(0))
//       .selectAll('text')
//       .style('font-size', '12px')
//       .style('text-anchor', 'end')
//       .each(function (_, i) {
//         const self = d3.select(this);
//         const text = self.text();
//         const maxWidth = margin.left - 30;
//         if ((self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//           let truncated = text;
//           while (truncated.length > 0 &&
//                 (self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//             truncated = truncated.slice(0, -1);
//             self.text(truncated + '...');
//           }
//         }
//         self.append('title').text(text);
//       });

//       // ==== Y Label ====
//       scrollSvg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -fullChartHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(this.Stackedbar_y_Axis.join(' / '));
      
//       // ==== X Axis (Fixed) ====
//       const xAxisSvg = d3.select(container)
//       .append('svg')
//       .attr('width', outerWidth)
//       .attr('height', margin.bottom)
//       .style('display', 'block');
      
//       xAxisSvg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisBottom(x).ticks(Math.max(Math.floor(width / 80), 2)).tickFormat(d3.format('~s')))
//       .selectAll('text')
//       .style('font-size', '12px');
      
//       xAxisSvg.append('text')
//       .attr('transform', `translate(${margin.left + width / 2},${margin.bottom - 5})`)
//       .style('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(`${this.aggregationType} (${this.Stackedbar_x_Axis.join(' + ')})`);
//     }
    
    
    
    
    
    
//     getSummaryStats(data: any[]): void {
//       const keys = Object.keys(data[0]).filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//       const values = data.flatMap(d => keys.map(k => +d[k] || 0));
//       const summary = {
//         total: d3.sum(values),
//         min: d3.min(values),
//         max: d3.max(values),
//         avg: (d3.mean(values) || 0).toFixed(2),
//       };
//       console.log(`${this.label} Summary:`, summary);
//     }

//     onEdit(): void {
//       this.editClicked.emit({
//         label: this.label,
//         aggregationFieldKey: this.aggregationFieldKey,
//         aggregationType: this.aggregationType,
//         Stackedbar_y_Axis: this.Stackedbar_y_Axis,
//         Stackedbar_x_Axis: this.Stackedbar_x_Axis,
//         Stackedbar_legend: this.Stackedbar_legend,
//         aggregationFields: this.aggregationFields,
//         uniqueIddata:this.uniqueId,
//         selectchartfunction:true
//       });
//     }
    
//     onDeleteFromChild(): void {
//       this.label = 'Stackedbar';
//       this.aggregationFields = {};
//       this.Stackedbar_y_Axis = [];
//       this.Stackedbar_x_Axis = [];
//       this.Stackedbar_legend = [];
//       this.aggregationType = '';
//       this.chartData = [];
//       this.aggregatedData = [];
//       this.showCharts = true;
//       this.deleteChart.emit(this.uniqueId);
//       this.editClickeds.emit({
//         label: this.label,
//         selectchartfunction:false
//       })

//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//       this.getSummaryStats(this.aggregatedData);
//     }
    
//     hidethepage(): void {
//       this.onDeleteFromChild();
//     }

//     handleClick(event: MouseEvent): void {
//       const target = event.target as HTMLElement;
//       if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//       this.onEdit();
//     }
    
//     ngOnDestroy(): void {
//       this.dataSubscription?.unsubscribe();
//       this.resizeObserver?.disconnect();
//     }

//     private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
//       return d3.select(container).append('div')
//       .attr('class', 'd3-tooltip')
//       .style('position', 'absolute')
//       .style('padding', '6px')
//         .style('background', 'rgba(0, 0, 0, 0.7)')
//         .style('margin-left', '30px')
//         .style('color', '#fff')
//         .style('pointer-events', 'none')
//         .style('border-radius', '4px')
//         .style('font-size', '12px')
//         .style('opacity', 0)
//         .style('z-index', '999');
//     }
//   }
        










// // renderChart(data: any[]): void {
//       //   const container = this.chartContainer.nativeElement;
//       //   d3.select(container).selectAll('*').remove();
      
//       //   const barHeight = 40;
//       //   const visibleHeight = 500; // fixed visible height for scrolling
//       //   const outerWidth = container.offsetWidth;
//       //   const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
//       //   const margin = { top: 60, right: 200, bottom: 40, left: 150 };
//       //   const width = outerWidth - margin.left - margin.right;
//       //   const height = fullChartHeight - margin.top - margin.bottom;
      
//       //   const keys = Object.keys(data[0])
//       //     .filter(k => !['group', ...this.Stackedbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
      
//       //   const stack = d3.stack<any>().keys(keys).value((d, key) => d[key] || 0);
//       //   const series = stack(data);
      
//       //   const yDomain = data.map(d => d.group);
//       //   const y = d3.scaleBand()
//       //     .domain(yDomain)
//       //     .range([0, height])
//       //     .paddingInner(0.2)
//       //     .paddingOuter(0.1);
      
//       //   const xMax = d3.max(data, d => d3.sum(keys.map(k => d[k] || 0))) ?? 0;
//       //   const x = d3.scaleLinear()
//       //     .domain([0, xMax])
//       //     .nice()
//       //     .range([0, width]);
      
//       //   const color = d3.scaleOrdinal<string, string>()
//       //     .domain(keys)
//       //     .range(d3.schemeSet2);
      
//       //   const tooltip = this.createTooltip(container);
      
//       //   // ==== Fixed X Axis SVG ====
//       //   const xAxisSvg = d3.select(container)
//       //     .append('svg')
//       //     .attr('width', outerWidth)
//       //     .attr('height', margin.top + margin.bottom)
//       //     .style('display', 'block');
      
//       //   // Chart title
//       //   xAxisSvg.append('text')
//       //     .attr('x', outerWidth / 2)
//       //     .attr('y', margin.top / 2)
//       //     .attr('text-anchor', 'middle')
//       //     .style('font-size', '16px')
//       //     .style('font-weight', 'bold')
//       //     .text(this.label || 'Stackedbar Chart');
      
//       //   // X Axis
//       //   xAxisSvg.append('g')
//       //   .attr('transform', `translate(${margin.left},${margin.top})`)
//       //   .call(d3.axisBottom(x)
//       //     .ticks(Math.max(Math.floor(width / 80), 2)) // Adjust tick count dynamically
//       //     .tickFormat(d3.format('~s')) // Use SI format for Power BI-like axis
//       //   )
//       //   .selectAll('text')
//       //   .style('font-size', '12px');
      
      
//       //   // X Axis Label
//       //   xAxisSvg.append('text')
//       //     .attr('transform', `translate(${margin.left + width / 2},${margin.top + margin.bottom - 5})`)
//       //     .style('text-anchor', 'middle')
//       //     .style('font-size', '12px')
//       //     .text(this.Stackedbar_x_Axis.join(' + '));
      
//       //   // ==== Scrollable Chart Area ====
//       //   const scrollContainer = d3.select(container)
//       //     .append('div')
//       //     .style('height', `${visibleHeight}px`)
//       //     .style('overflow-y', 'auto')
//       //     .style('position', 'relative');
      
//       //   const scrollSvg = scrollContainer
//       //     .append('svg')
//       //     .attr('width', outerWidth)
//       //     .attr('height', fullChartHeight);
      
//       //   const chart = scrollSvg.append('g')
//       //     .attr('transform', `translate(${margin.left},${margin.top})`);
      
//       //   // Bars
//       //   chart.selectAll('g.layer')
//       //     .data(series)
//       //     .join('g')
//       //     .attr('class', 'layer')
//       //     .attr('fill', d => color(d.key) as string)
//       //     .selectAll('rect')
//       //     .data(d => d.map(entry => ({ ...entry, key: d.key })))
//       //     .join('rect')
//       //     .attr('y', d => y(d.data.group)!)
//       //     .attr('x', d => x(d[0]))
//       //     .attr('width', d => x(d[1]) - x(d[0]))
//       //     .attr('height', y.bandwidth())
//       //     .on('mouseover', () => tooltip.style('opacity', 1))
//       //     .on('mousemove', (event, d) => {
//       //       const [mouseX, mouseY] = d3.pointer(event, container);
//       //       const xLabel = this.Stackedbar_y_Axis
//       //         .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//       //         .join('<br>');
//       //       const value = d.data[d.key];
//       //       tooltip.html(`
//       //         ${xLabel}<br>
//       //         <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//       //       `)
//       //         .style('left', `${mouseX + 20}px`)
//       //         .style('top', `${mouseY}px`);
//       //     })
//       //     .on('mouseleave', () => tooltip.style('opacity', 0))
//       //     .on('click', () => this.onEdit());
      
//       //   // Y Axis
//       //   chart.append('g')
//       //     .call(d3.axisLeft(y).tickSizeOuter(0))
//       //     .selectAll('text')
//       //     .style('font-size', '12px');
      
//       //   // Y Axis Label (Rotated)
//       //   scrollSvg.append('text')
//       //     .attr('transform', 'rotate(-90)')
//       //     .attr('x', -fullChartHeight / 2)
//       //     .attr('y', 15)
//       //     .attr('text-anchor', 'middle')
//       //     .style('font-size', '12px')
//       //     .text(this.Stackedbar_y_Axis.join(' / '));
      
//       //   // Legend (Fixed Position)
//       //   const legend = d3.select(container)
//       //     .append('svg')
//       //     .attr('width', margin.right)
//       //     .attr('height', fullChartHeight)
//       //     .style('position', 'absolute')
//       //     .style('top', `${margin.top}px`)
//       //     .style('right', '0px');
      
//       //   const legendG = legend.append('g')
//       //     .attr('transform', 'translate(10, 10)');
      
//       //   keys.forEach((key, i) => {
//       //     const yPos = i * 20;
//       //     legendG.append('rect')
//       //       .attr('x', 0)
//       //       .attr('y', yPos)
//       //       .attr('width', 14)
//       //       .attr('height', 14)
//       //       .attr('fill', color(key) as string);
      
//       //     legendG.append('text')
//       //       .attr('x', 20)
//       //       .attr('y', yPos + 12)
//       //       .style('font-size', '12px')
//       //       .text(key);
//       //   });
//       // }