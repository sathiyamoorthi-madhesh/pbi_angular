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
  clusteredbar_y_Axis: string[];
  clusteredbar_x_Axis: string[];
  clusteredbar_legend: string[];
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-clusteredbar',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
  templateUrl: './clusteredbar.component.html',
  styleUrls: ['./clusteredbar.component.scss']
})
export class ClusteredbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() label: string = 'clusteredbar';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() clusteredbar_y_Axis: string[] = [];
  @Input() clusteredbar_x_Axis: string[] = [];
  @Input() clusteredbar_legend: string[] = [];
  @Input() uniqueId: any = '';
  @Input({ transform: booleanAttribute }) showCharts: boolean = true;
  @Input() title: string = '';
  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<number>();
  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;

  chartData: any[] = [];
  aggregatedData: any[] = [];
  aggregationType: string = 'Sum';
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

      this.data2 = data.clusteredbar_x_Axis ?? [];
      this.data3 = data.clusteredbar_y_Axis ?? [];
      this.data4 = data.clusteredbar_legend ?? [];
      this.showCharts = false;
      this.chartData = data.data ?? [];
      this.aggregationFields = data.aggregationFields ?? {};
      this.aggregationType = data.fields[0] ?? 'Sum';
      this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

      this.clusteredbar_y_Axis = (data.clusteredbar_y_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.clusteredbar_x_Axis = (data.clusteredbar_x_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.clusteredbar_legend = (data.clusteredbar_legend ?? []).map((f: any) => f.split('.')[0]);

      // Handle highlighting based on activedata
      this.highlightSet.clear();
      if (data.activedata?.length && this.clusteredbar_y_Axis.length) {
        data.activedata.forEach((row: any) => {
          const groupKey = this.getKey(row, this.clusteredbar_y_Axis);
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

    const grouped = d3.groups(data, d => this.getKey(d, this.clusteredbar_y_Axis));
    const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredbar_legend))));

    return grouped.map(([groupKey, records]) => {
      const row: any = { group: groupKey, isHighlighted: this.highlightSet.has(groupKey) };
      this.clusteredbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
      for (const legend of legendKeys) {
        const subRecords = records.filter(r => this.getKey(r, this.clusteredbar_legend) === legend);
        row[legend] = this.aggregateValues(subRecords, this.clusteredbar_x_Axis);
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

  private formatYAxisLabel(fullLabel: string, totalGroups: number, availableHeight: number): string {
    const parts = fullLabel.split(' | ');
    const maxCharsPerPart = Math.max(3, Math.floor(availableHeight / totalGroups / parts.length / 1.6));
    return parts
      .map(p => {
        const formatter = this.xAxisFormatters[p] || ((v: any) => String(v));
        const formatted = formatter(p);
        return formatted.length > maxCharsPerPart ? formatted.substring(0, maxCharsPerPart - 1) + '…' : formatted;
      })
      .join(' | ');
  }

  getGroupLabelLines(d: any): string[] {
    return this.clusteredbar_y_Axis.map((axis: any, i: number) => {
      const value = d[`_x${i}`] ?? '';
      const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
      const formatter = this.xAxisFormatters[fieldName] || ((v: any) => String(v));
      return formatter(value);
    });
  }

  showSwalTable(d: any): void {
    // Filter rows where y-axis group matches
    const fullData = this.chartData.filter(
      (row) => this.getKey(row, this.clusteredbar_y_Axis) === d.group
    );

    // Get unique y-axis values
    const uniqueValues = [...new Set(fullData.map((row) => this.getKey(row, this.clusteredbar_y_Axis)))];

    // Format as { yAxisFieldName: [data1, data2, ...] }
    const formattedData = {
      [this.clusteredbar_y_Axis.join('_')]: uniqueValues
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

    if (!data?.length || !this.clusteredbar_x_Axis?.length || !this.clusteredbar_y_Axis?.length) {
      d3.select(container)
        .append('div')
        .style('text-align', 'center')
        .style('color', 'red')
        .style('margin-top', '20px')
        .style('font-weight', 'bold')
        .text('Please select both X and Y Axis fields to display the chart.');
      return;
    }

    const barHeight = 40;
    const visibleHeight = 500;
    const outerWidth = container.offsetWidth || 800;
    const longestLabelLength = d3.max(data, d => d.group?.length) ?? 10;
    const estimatedLabelWidth = longestLabelLength * 7.5;
    const margin = {
      top: 40,
      right: 200,
      bottom: 60,
      left: Math.max(180, estimatedLabelWidth + 40)
    };
    const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
    const width = outerWidth - margin.left - margin.right;
    const height = fullChartHeight - margin.top - margin.bottom;

    const keys = Object.keys(data[0] || {})
      .filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));

    const sortedData = data.slice().sort((a, b) => {
      const sumA = keys.reduce((acc, key) => acc + (a[key] || 0), 0);
      const sumB = keys.reduce((acc, key) => acc + (b[key] || 0), 0);
      return sumB - sumA;
    });

    const y0 = d3.scaleBand()
      .domain(sortedData.map(d => d.group))
      .range([0, height])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const y1 = d3.scaleBand()
      .domain(keys)
      .range([0, y0.bandwidth()])
      .padding(0.05);

    const xMax = d3.max(data, d => d3.max(keys, key => d[key] || 0)) ?? 0;
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
      .text(this.label || 'Clusteredbar Chart');

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

    const groups = chart.selectAll('g.group')
      .data(sortedData)
      .join('g')
      .attr('class', 'group')
      .attr('transform', d => `translate(0,${y0(d.group)})`);

    groups.selectAll('rect')
      .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
      .join('rect')
      .attr('y', d => y1(d.key)!)
      .attr('x', 0)
      .attr('width', d => x(d.value < 0 ? 0:d.value))
      .attr('height', y1.bandwidth())
      .attr('fill', d => d.data.isHighlighted ? '#007bff' : color(d.key)) // Highlight based on isHighlighted
      .on('mouseover', () => tooltip.style('opacity', 1))
      .on('mousemove', (event, d) => {
        const [mouseX, mouseY] = d3.pointer(event, container);
        const yLabels = this.clusteredbar_y_Axis
          .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
          .join('<br>');
        tooltip.html(`
          ${yLabels}<br>
          <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
        `)
          .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
          .style('top', `${Math.min(mouseY, visibleHeight - 50)}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (_, d) => this.showSwalTable(d.data));

    chart.append('g')
      .call(d3.axisLeft(y0).tickSizeOuter(0))
      .selectAll<SVGTextElement, string>('text')
      .style('font-size', '12px')
      .style('text-anchor', 'end')
      .text(d => this.formatYAxisLabel(d, data.length, height))
      .append('title')
      .text(d => d);

    scrollSvg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -fullChartHeight / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(this.clusteredbar_y_Axis.join(' / '));

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
      .text(`${this.aggregationType} (${this.clusteredbar_x_Axis.join(' + ')})`);
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
      clusteredbar_y_Axis: this.data3 ?? [],
      clusteredbar_x_Axis: this.data2 ?? [],
      clusteredbar_legend: this.data4 ?? [],
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  getSummaryStats(data: any[]): void {
    if (!data?.length) return;
    const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));
    const values = data.flatMap(d => keys.map(k => +d[k] || 0));
    const summary = {
      total: d3.sum(values),
      min: d3.min(values) ?? 0,
      max: d3.max(values) ?? 0,
      avg: (d3.mean(values) || 0).toFixed(2)
    };
    console.log(`${this.label} Summary:`, summary);
  }

  onEdit(): void {
    this.emitEditEvent();
  }

  onDeleteFromChild(): void {
    this.label = 'clusteredbar';
    this.aggregationFields = {};
    this.clusteredbar_y_Axis = [];
    this.clusteredbar_x_Axis = [];
    this.clusteredbar_legend = [];
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
//   clusteredbar_y_Axis: string[];
//   clusteredbar_x_Axis: string[];
//   clusteredbar_legend: string[];
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-clusteredbar',
//   standalone: true,
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
//   templateUrl: './clusteredbar.component.html',
//   styleUrls: ['./clusteredbar.component.scss']
// })
// export class ClusteredbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//   @Input() label: string = 'clusteredbar';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() clusteredbar_y_Axis: string[] = [];
//   @Input() clusteredbar_x_Axis: string[] = [];
//   @Input() clusteredbar_legend: string[] = [];
//   @Input() uniqueId: any = '';
//   @Input({ transform: booleanAttribute }) showCharts: boolean = true;
//   @Input() title: string = '';
//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<number>();
//   @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;

//   chartData: any[] = [];
//   aggregatedData: any[] = [];
//   aggregationType: string = 'Sum';
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

//       this.data2 = data.clusteredbar_x_Axis ?? [];
//       this.data3 = data.clusteredbar_y_Axis ?? [];
//       this.data4 = data.clusteredbar_legend ?? [];
//       this.showCharts = false;
//       this.chartData = data.data ?? [];
//       this.aggregationFields = data.aggregationFields ?? {};
//       this.aggregationType = data.fields[0] ?? 'Sum';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

//       this.clusteredbar_y_Axis = (data.clusteredbar_y_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_x_Axis = (data.clusteredbar_x_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_legend = (data.clusteredbar_legend ?? []).map((f: any) => f.split('.')[0]);

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

//     const grouped = d3.groups(data, d => this.getKey(d, this.clusteredbar_y_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredbar_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.clusteredbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.clusteredbar_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.clusteredbar_x_Axis);
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

//   private formatYAxisLabel(fullLabel: string, totalGroups: number, availableHeight: number): string {
//     const parts = fullLabel.split(' | ');
//     const maxCharsPerPart = Math.max(3, Math.floor(availableHeight / totalGroups / parts.length / 1.6));
//     return parts
//       .map(p => {
//         const formatter = this.xAxisFormatters[p] || ((v: any) => String(v));
//         const formatted = formatter(p);
//         return formatted.length > maxCharsPerPart ? formatted.substring(0, maxCharsPerPart - 1) + '…' : formatted;
//       })
//       .join(' | ');
//   }

//   getGroupLabelLines(d: any): string[] {
//     return this.clusteredbar_y_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       const formatter = this.xAxisFormatters[fieldName] || ((v: any) => String(v));
//       return formatter(value);
//     });
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer) return;

//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();

//     if (!data?.length || !this.clusteredbar_x_Axis?.length || !this.clusteredbar_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('text-align', 'center')
//         .style('color', 'red')
//         .style('margin-top', '20px')
//         .style('font-weight', 'bold')
//         .text('Please select both X and Y Axis fields to display the chart.');
//       return;
//     }

//     const barHeight = 40;
//     const visibleHeight = 500;
//     const outerWidth = container.offsetWidth || 800;
//     const longestLabelLength = d3.max(data, d => d.group?.length) ?? 10;
//     const estimatedLabelWidth = longestLabelLength * 7.5;
//     const margin = {
//       top: 40,
//       right: 200,
//       bottom: 60,
//       left: Math.max(180, estimatedLabelWidth + 40)
//     };
//     const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
//     const width = outerWidth - margin.left - margin.right;
//     const height = fullChartHeight - margin.top - margin.bottom;

//     const keys = Object.keys(data[0] || {})
//       .filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));

//     const sortedData = data.slice().sort((a, b) => {
//       const sumA = keys.reduce((acc, key) => acc + (a[key] || 0), 0);
//       const sumB = keys.reduce((acc, key) => acc + (b[key] || 0), 0);
//       return sumB - sumA;
//     });

//     const y0 = d3.scaleBand()
//       .domain(sortedData.map(d => d.group))
//       .range([0, height])
//       .paddingInner(0.2)
//       .paddingOuter(0.1);

//     const y1 = d3.scaleBand()
//       .domain(keys)
//       .range([0, y0.bandwidth()])
//       .padding(0.05);

//     const xMax = d3.max(data, d => d3.max(keys, key => d[key] || 0)) ?? 0;
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
//       .text(this.label || 'Clusteredbar Chart');

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

//     const groups = chart.selectAll('g.group')
//       .data(sortedData)
//       .join('g')
//       .attr('class', 'group')
//       .attr('transform', d => `translate(0,${y0(d.group)})`);

//     groups.selectAll('rect')
//       .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
//       .join('rect')
//       .attr('y', d => y1(d.key)!)
//       .attr('x', 0)
//       .attr('width', d => x(d.value))
//       .attr('height', y1.bandwidth())
//       .attr('fill', d => color(d.key))
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const yLabels = this.clusteredbar_y_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         tooltip.html(`
//           ${yLabels}<br>
//           <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
//         `)
//           .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
//           .style('top', `${Math.min(mouseY, visibleHeight - 50)}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.emitEditEvent());

//     chart.append('g')
//       .call(d3.axisLeft(y0).tickSizeOuter(0))
//       .selectAll<SVGTextElement, string>('text')
//       .style('font-size', '12px')
//       .style('text-anchor', 'end')
//       .text(d => this.formatYAxisLabel(d, data.length, height))
//       .append('title')
//       .text(d => d);

//     scrollSvg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -fullChartHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(this.clusteredbar_y_Axis.join(' / '));

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
//       .text(`${this.aggregationType} (${this.clusteredbar_x_Axis.join(' + ')})`);
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
//       clusteredbar_y_Axis: this.data3 ?? [],
//       clusteredbar_x_Axis: this.data2 ?? [],
//       clusteredbar_legend: this.data4 ?? [],
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   getSummaryStats(data: any[]): void {
//     if (!data?.length) return;
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const values = data.flatMap(d => keys.map(k => +d[k] || 0));
//     const summary = {
//       total: d3.sum(values),
//       min: d3.min(values) ?? 0,
//       max: d3.max(values) ?? 0,
//       avg: (d3.mean(values) || 0).toFixed(2)
//     };
//     console.log(`${this.label} Summary:`, summary);
//   }

//   onEdit(): void {
//     this.emitEditEvent();
//   }

//   onDeleteFromChild(): void {
//     this.label = 'clusteredbar';
//     this.aggregationFields = {};
//     this.clusteredbar_y_Axis = [];
//     this.clusteredbar_x_Axis = [];
//     this.clusteredbar_legend = [];
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





// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, OnChanges,
//   ViewChild, ElementRef
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
//   clusteredbar_y_Axis: string[];
//   clusteredbar_x_Axis: string[];
//   clusteredbar_legend: string[];
//   uniqueIddata: any,
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }
// export interface deleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-clusteredbar',
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
//   templateUrl: './clusteredbar.component.html',
//   styleUrl: './clusteredbar.component.scss',
// })
// export class ClusteredbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//   @Input() label: string = 'clusteredbar';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() clusteredbar_y_Axis: string[] = [];
//   @Input() clusteredbar_x_Axis: string[] = [];
//   @Input() clusteredbar_legend: string[] = [];
//   @Input() uniqueId: any = '';
//   @Input() showCharts: boolean = true;
//   @Input() title: string = '';
//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<deleteChartEdits>();
//   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
//   @Output() deleteChart = new EventEmitter<number>();

//   chartData: any[] = [];
//   aggregatedData: any[] = [];
//   aggregationType: string = 'Sum';
//   aggregationFieldKey: string = '';
//   private dataSubscription?: Subscription;
//   private resizeObserver?: ResizeObserver;
//   private hasViewInitialized = false;

//   xAxisFormatters: { [field: string]: (value: any) => string } = {};

//   constructor(private coreService: CoreService) { }

//   ngOnInit(): void {
//     this.itchartdata();
//     console.log('the function of title', this.title, '--------ok-------------');

//   }

//   itchartdata() {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//       if (this.uniqueId === data.uniqueIddata) {
//       this.showCharts = false;
//       this.chartData = data.data || [];
//       this.aggregationFields = data.aggregationFields || {};
//       this.aggregationType = data.aggregation || 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] || '';

//       this.clusteredbar_y_Axis = (data.clusteredbar_y_Axis || []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_x_Axis = (data.clusteredbar_x_Axis || []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_legend = (data.clusteredbar_legend || []).map((f: any) => f.split('.')[0]);

//       this.aggregatedData = this.aggregateData(this.chartData);
//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//       this.getSummaryStats(this.aggregatedData);
//       }
//     });
//   }

//   ngAfterViewInit(): void {
//     this.hasViewInitialized = true;
//     this.resizeObserver = new ResizeObserver(() => {
//       if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//     });
//     if (this.chartContainer?.nativeElement) {
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//   }

//   ngOnChanges(): void {
//     if (this.chartData?.length) {
//       this.renderChart(this.chartData);
//     }
//   }

//   private getKey(d: any, fields: string[]): string {
//     return fields.map(f => d[f]).join(' | ');
//   }

//   private aggregateData(data: any[]): any[] {
//     const grouped = d3.groups(data, d => this.getKey(d, this.clusteredbar_y_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredbar_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.clusteredbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0][f]);

//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.clusteredbar_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.clusteredbar_x_Axis);
//       }

//       return row;
//     });
//   }

//   private aggregateValues(records: any[], fields: string[]): number {
//     const values = records.flatMap(r => fields.map(f => +r[f])).filter(v => !isNaN(v));
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

//   getGroupLabelLines(d: any): string[] {
//     return this.clusteredbar_y_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       // Add field name to the last line
//       if (i === this.clusteredbar_y_Axis.length - 1) {
//         return `${value} (${axis})`;
//       }
//       return `${value}`;
//     });
//   }

//   // renderChart(data: any[]): void {
//   //   const container = this.chartContainer.nativeElement;
//   //   d3.select(container).selectAll('*').remove();

//   //   // ==== Axis Selection Validation ====
//   //   if (!this.clusteredbar_x_Axis?.length || !this.clusteredbar_y_Axis?.length) {
//   //     d3.select(container)
//   //       .append('div')
//   //       .style('text-align', 'center')
//   //       .style('color', 'red')
//   //       .style('margin-top', '20px')
//   //       .style('font-weight', 'bold')
//   //       .text('Please select both X and Y Axis fields to display the chart.');
//   //     return;
//   //   }

//   //   const outerWidth = container.offsetWidth;
//   //   const barHeight = 40;
//   //   const visibleHeight = 500;

//   //   const groupByIndex = this.clusteredbar_y_Axis.length - 1;
//   //   const groupByField = `_x${groupByIndex}`;
//   //   const subgroupFields = this.clusteredbar_y_Axis
//   //     .map((_, i) => `_x${i}`)
//   //     .filter((_, i) => i !== groupByIndex);

//   //   const groups = d3.group(data, d => d[groupByField]);

//   //   // Determine keys (fields to render as bars)
//   //   const keys = Object.keys(data[0])
//   //     .filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));

//   //   const xMax = d3.max(data, d => d3.max(keys, k => d[k] || 0)) ?? 0;

//   //   // ==== Scales and Color ====
//   //   const x = d3.scaleLinear()
//   //     .domain([0, xMax])
//   //     .nice();

//   //   const color = d3.scaleOrdinal<string, string>()
//   //     .domain(keys)
//   //     .range(d3.schemeSet2);

//   //   const tooltip = this.createTooltip(container);

//   //   // ==== Title ====
//   //   d3.select(container)
//   //     .append('div')
//   //     .style('text-align', 'center')
//   //     .style('font-weight', 'bold')
//   //     .style('font-size', '16px')
//   //     .style('margin-bottom', '4px')
//   //     .text(this.label || 'clusteredbar Chart');

//   //   // ==== Scrollable Chart Container ====
//   //   const scrollContainer = d3.select(container)
//   //     .append('div')
//   //     .style('height', `${visibleHeight}px`)
//   //     .style('overflow-y', 'auto')
//   //     .style('position', 'relative');

//   //   const chartSections: SVGGElement[] = [];
//   //   let totalHeight = 0;

//   //   const margin = {
//   //     top: 30,
//   //     right: 200,
//   //     bottom: 60,
//   //     left: 150
//   //   };

//   //   // Measure longest label
//   //   const longestLabel = d3.max(data, d => d.group.length) ?? 10;
//   //   const estimatedLabelWidth = longestLabel * 7.5;
//   //   margin.left = Math.max(150, estimatedLabelWidth + 40);

//   //   const width = outerWidth - margin.left - margin.right;
//   //   x.range([0, width]);

//   //   const sectionHeights: number[] = [];

//   //   // ==== Loop Through Grouped Data ====
//   //   for (const [groupValue, groupData] of groups.entries()) {
//   //     // Sort data within group
//   //     const sorted = groupData.slice().sort((a, b) => {
//   //       const sumA = keys.reduce((acc, key) => acc + (a[key] || 0), 0);
//   //       const sumB = keys.reduce((acc, key) => acc + (b[key] || 0), 0);
//   //       return sumB - sumA;
//   //     });

//   //     const yDomain = sorted.map(d => d.group);
//   //     const y0 = d3.scaleBand()
//   //       .domain(yDomain)
//   //       .range([0, sorted.length * barHeight])
//   //       .paddingInner(0.2)
//   //       .paddingOuter(0.1);

//   //     const y1 = d3.scaleBand()
//   //       .domain(keys)
//   //       .range([0, y0.bandwidth()])
//   //       .padding(0.05);

//   //     const sectionHeight = y0.range()[1] + margin.top + 30;
//   //     sectionHeights.push(sectionHeight);
//   //     totalHeight += sectionHeight;

//   //     const svg = scrollContainer.append('svg')
//   //       .attr('width', outerWidth)
//   //       .attr('height', sectionHeight);

//   //     const chart = svg.append('g')
//   //       .attr('transform', `translate(${margin.left},${margin.top})`);

//   //     // Sub-chart title
//   //     svg.append('text')
//   //       .attr('x', outerWidth / 2)
//   //       .attr('y', 20)
//   //       .attr('text-anchor', 'middle')
//   //       .style('font-weight', 'bold')
//   //       .text(`${groupByField.replace('_x', this.clusteredbar_y_Axis[groupByIndex])}: ${groupValue}`);

//   //     // Draw Y-axis
//   //     chart.append('g')
//   //       .call(d3.axisLeft(y0).tickSizeOuter(0))
//   //       .selectAll('text')
//   //       .style('font-size', '12px')
//   //       .style('text-anchor', 'end')
//   //       .each(function (_, i) {
//   //         const self = d3.select(this);
//   //         const text = self.text();
//   //         const maxWidth = margin.left - 30;

//   //         if ((self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//   //           let truncated = text;
//   //           while (truncated.length > 0 &&
//   //             (self.node() as SVGTextElement).getComputedTextLength() > maxWidth) {
//   //             truncated = truncated.slice(0, -1);
//   //             self.text(truncated + '...');
//   //           }
//   //         }

//   //         self.append('title').text(text);
//   //       });

//   //     // Draw bars
//   //     const groupsG = chart.selectAll('g.group')
//   //       .data(sorted)
//   //       .join('g')
//   //       .attr('class', 'group')
//   //       .attr('transform', d => `translate(0,${y0(d.group)})`);

//   //     groupsG.selectAll('rect')
//   //       .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
//   //       .join('rect')
//   //       .attr('y', d => y1(d.key)!)
//   //       .attr('x', 0)
//   //       .attr('width', d => x(d.value))
//   //       .attr('height', y1.bandwidth())
//   //       .attr('fill', d => color(d.key) as string)
//   //       .on('mouseover', () => tooltip.style('opacity', 1))
//   //       .on('mousemove', (event, d) => {
//   //         const [mouseX, mouseY] = d3.pointer(event, container);
//   //         const xLabel = this.clusteredbar_y_Axis
//   //           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//   //           .join('<br>');
//   //         const value = d.value;
//   //         tooltip.html(`
//   //           ${xLabel}<br>
//   //           <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//   //         `)
//   //           .style('left', `${mouseX + 20}px`)
//   //           .style('top', `${mouseY}px`);
//   //       })
//   //       .on('mouseleave', () => tooltip.style('opacity', 0))
//   //       .on('click', () => this.onEdit());
//   //   }

//   //   // ==== Shared X-Axis ====
//   //   const xAxisSvg = d3.select(container)
//   //     .append('svg')
//   //     .attr('width', outerWidth)
//   //     .attr('height', margin.bottom)
//   //     .style('display', 'block');

//   //   xAxisSvg.append('g')
//   //     .attr('transform', `translate(${margin.left},0)`)
//   //     .call(d3.axisBottom(x)
//   //       .ticks(Math.max(Math.floor(width / 80), 2))
//   //       .tickFormat(d3.format('~s')))
//   //     .selectAll('text')
//   //     .style('font-size', '12px');

//   //   xAxisSvg.append('text')
//   //     .attr('transform', `translate(${margin.left + width / 2},${margin.bottom - 5})`)
//   //     .style('text-anchor', 'middle')
//   //     .style('font-size', '12px')
//   //     .style('pointer-events', 'none')
//   //     .text(this.clusteredbar_x_Axis.join(' + '));

//   //   // ==== Shared Legend ====
//   //   const legend = d3.select(container)
//   //     .append('svg')
//   //     .attr('width', margin.right)
//   //     .attr('height', totalHeight)
//   //     .style('position', 'absolute')
//   //     .style('top', `${margin.top}px`)
//   //     .style('right', '0px');

//   //   const legendG = legend.append('g')
//   //     .attr('transform', 'translate(10, 10)');

//   //   keys.forEach((key, i) => {
//   //     const yPos = i * 20;
//   //     legendG.append('rect')
//   //       .attr('x', 0)
//   //       .attr('y', yPos)
//   //       .attr('width', 14)
//   //       .attr('height', 14)
//   //       .attr('fill', color(key) as string);

//   //     legendG.append('text')
//   //       .attr('x', 20)
//   //       .attr('y', yPos + 12)
//   //       .style('font-size', '12px')
//   //       .style('pointer-events', 'none')
//   //       .text(key);
//   //   });
//   // }

//   private formatYAxisLabel(fullLabel: string, totalGroups: number, availableHeight: number): string {
//     const parts = fullLabel.split(' | ');
//     const maxCharsPerPart = Math.max(3, Math.floor(availableHeight / totalGroups / parts.length / 1.6));
//     return parts
//       .map(p => (p.length > maxCharsPerPart ? p.substring(0, maxCharsPerPart - 1) + '…' : p))
//       .join(' | ');
//   }

//   renderChart(data: any[]): void {
//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();

//     if (!this.clusteredbar_x_Axis?.length || !this.clusteredbar_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('text-align', 'center')
//         .style('color', 'red')
//         .style('margin-top', '20px')
//         .style('font-weight', 'bold')
//         .text('Please select both X and Y Axis fields to display the chart.');
//       return;
//     }

//     const barHeight = 40;
//     const visibleHeight = 500;
//     const outerWidth = container.offsetWidth;

//     const keys = Object.keys(data[0]).filter(k =>
//       k !== 'group' && !this.clusteredbar_y_Axis.some((_, i) => k === `_x${i}`)
//     );

//     data = data.slice().sort((a, b) => {
//       const sumA = keys.reduce((acc, key) => acc + (a[key] || 0), 0);
//       const sumB = keys.reduce((acc, key) => acc + (b[key] || 0), 0);
//       return sumB - sumA;
//     });

//     const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
//     const longestLabelLength = d3.max(data, d => d.group.length) ?? 10;
//     const estimatedLabelWidth = longestLabelLength * 7.5;
//     const margin = {
//       top: 40,
//       right: 200,
//       bottom: 60,
//       left: Math.max(180, 40),
//     };

//     const width = outerWidth - margin.left - margin.right;
//     const height = fullChartHeight - margin.top - margin.bottom;

//     const y0 = d3.scaleBand()
//       .domain(data.map(d => d.group))
//       .range([0, height])
//       .paddingInner(0.2)
//       .paddingOuter(0.1);

//     const y1 = d3.scaleBand()
//       .domain(keys)
//       .range([0, y0.bandwidth()])
//       .padding(0.05);

//     const xMax = d3.max(data, d => d3.max(keys, key => d[key] || 0)) ?? 0;
//     const x = d3.scaleLinear()
//       .domain([0, xMax])
//       .nice()
//       .range([0, width]);

//     const color = d3.scaleOrdinal<string, string>()
//       .domain(keys)
//       .range(d3.schemeSet2);

//     const tooltip = this.createTooltip(container);

//     // Title
//     d3.select(container).append('div')
//       .style('text-align', 'center')
//       .style('font-weight', 'bold')
//       .style('font-size', '16px')
//       .style('margin-bottom', '4px')
//       .text(this.label || 'clusteredbar Chart');

//     // Legend
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
//       const currentKeys = keys.slice(
//         legendPage * itemsPerPage,
//         (legendPage + 1) * itemsPerPage
//       );

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
//     renderLegend();

//     const scrollContainer = d3.select(container).append('div')
//       .style('height', `${visibleHeight}px`)
//       .style('overflow-y', 'auto')
//       .style('position', 'relative');

//     const scrollSvg = scrollContainer.append('svg')
//       .attr('width', outerWidth - margin.right)
//       .attr('height', fullChartHeight);

//     const chart = scrollSvg.append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     const groups = chart.selectAll('g.group')
//       .data(data)
//       .join('g')
//       .attr('class', 'group')
//       .attr('transform', d => `translate(0,${y0(d.group)})`);

//     groups.selectAll('rect')
//       .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
//       .join('rect')
//       .attr('y', d => y1(d.key)!)
//       .attr('x', 0)
//       .attr('width', d => x(d.value))
//       .attr('height', y1.bandwidth())
//       .attr('fill', d => color(d.key))
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabels = this.clusteredbar_y_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         tooltip.html(`
//         ${xLabels}<br>
//         <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
//       `)
//           .style('left', `${mouseX + 20}px`)
//           .style('top', `${mouseY}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.onEdit());

//     chart.append('g')
//       .call(d3.axisLeft(y0).tickSizeOuter(0))
//       .selectAll<SVGTextElement, string>('text')
//       .style('font-size', '12px')
//       .style('text-anchor', 'end')
//       .text(d => this.formatYAxisLabel(d, data.length, height))
//       .append('title')
//       .text(d => d);

//     scrollSvg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -fullChartHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(this.clusteredbar_y_Axis.join(' / '));

//     const xAxisSvg = d3.select(container).append('svg')
//       .attr('width', outerWidth - margin.right)
//       .attr('height', margin.bottom)
//       .style('display', 'block');

//     xAxisSvg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisBottom(x)
//         .ticks(Math.max(Math.floor(width / 80), 2))
//         .tickFormat(d3.format('~s')))
//       .selectAll('text')
//       .style('font-size', '12px');

//     xAxisSvg.append('text')
//       .attr('transform', `translate(${margin.left + width / 2},${margin.bottom - 5})`)
//       .style('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .style('pointer-events', 'none')
//       .text(`${this.aggregationType} (${this.clusteredbar_x_Axis.join(' + ')})`);
//   }


//   // private formatYAxisLabel(fullLabel: string): string {
//   //   const parts = fullLabel.split(' | ');
//   //   return parts.map((p: string) => p.substring(0, 3)).join(' | ');
//   // }




//   getSummaryStats(data: any[]): void {
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const values = data.flatMap(d => keys.map(k => +d[k] || 0));
//     const summary = {
//       total: d3.sum(values),
//       min: d3.min(values),
//       max: d3.max(values),
//       avg: (d3.mean(values) || 0).toFixed(2),
//     };
//     console.log(`${this.label} Summary:`, summary);
//   }

//   onEdit(): void {
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       clusteredbar_y_Axis: this.clusteredbar_y_Axis,
//       clusteredbar_x_Axis: this.clusteredbar_x_Axis,
//       clusteredbar_legend: this.clusteredbar_legend,
//       uniqueIddata:this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'clusteredbar';
//     this.aggregationFields = {};
//     this.clusteredbar_y_Axis = [];
//     this.clusteredbar_x_Axis = [];
//     this.clusteredbar_legend = [];
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;

//     this.deleteChart.emit(this.uniqueId);
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false
//     })
//     if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//     this.getSummaryStats(this.aggregatedData);
//   }
  

//   hidethepage(): void {
//     this.onDeleteFromChild();
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//     this.onEdit();
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }

//   private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
//     return d3.select(container).append('div')
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
// }







// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, OnChanges,
//   ViewChild, ElementRef
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
//   clusteredbar_y_Axis: string[];
//   clusteredbar_x_Axis: string[];
//   clusteredbar_legend: string[];
//   aggregationFields: { [key: string]: string };
// }
// @Component({
//   selector: 'app-clusteredbar',
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
//   templateUrl: './clusteredbar.component.html',
//   styleUrl: './clusteredbar.component.scss',
// })
// export class ClusteredbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//  @Input() label: string = 'Clusteredbar';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() clusteredbar_y_Axis: string[] = [];
//   @Input() clusteredbar_x_Axis: string[] = [];
//   @Input() clusteredbar_legend: string[] = [];
//   @Input() showCharts: boolean = true;

//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

//   chartData: any[] = [];
//   aggregatedData: any[] = [];
//   aggregationType: string = 'Sum';
//   aggregationFieldKey: string = '';
//   private dataSubscription?: Subscription;
//   private resizeObserver?: ResizeObserver;
//   private hasViewInitialized = false;

//   xAxisFormatters: { [field: string]: (value: any) => string } = {};

//   constructor(private coreService: CoreService) { }

//   ngOnInit(): void {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//       this.showCharts = false;
//       this.chartData = data.data || [];
//       this.aggregationFields = data.aggregationFields || {};
//       this.aggregationType = data.aggregation || 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] || '';

//       this.clusteredbar_y_Axis = (data.clusteredbar_y_Axis || []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_x_Axis = (data.clusteredbar_x_Axis || []).map((f: any) => f.split('.')[0]);
//       this.clusteredbar_legend = (data.clusteredbar_legend || []).map((f: any) => f.split('.')[0]);

//       this.aggregatedData = this.aggregateData(this.chartData);
//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//       this.getSummaryStats(this.aggregatedData);
//     });
//   }

//   ngAfterViewInit(): void {
//     this.hasViewInitialized = true;
//     this.resizeObserver = new ResizeObserver(() => {
//       if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//     });
//     if (this.chartContainer?.nativeElement) {
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.aggregatedData.length) this.renderChart(this.aggregatedData);
//   }

//   ngOnChanges(): void {
//     if (this.chartData?.length) {
//       this.renderChart(this.chartData);
//     }
//   }

//   private getKey(d: any, fields: string[]): string {
//     return fields.map(f => d[f]).join(' | ');
//   }

//   private aggregateData(data: any[]): any[] {
//     const grouped = d3.groups(data, d => this.getKey(d, this.clusteredbar_y_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredbar_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.clusteredbar_y_Axis.forEach((f, i) => row[`_x${i}`] = records[0][f]);

//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.clusteredbar_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.clusteredbar_x_Axis);
//       }

//       return row;
//     });
//   }

//   private aggregateValues(records: any[], fields: string[]): number {
//     const values = records.flatMap(r => fields.map(f => +r[f])).filter(v => !isNaN(v));
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

// getGroupLabelLines(d: any): string[] {
//   return this.clusteredbar_y_Axis.map((axis: any, i: number) => {
//     const value = d[`_x${i}`] ?? '';
//     // Add field name to the last line
//     if (i === this.clusteredbar_y_Axis.length - 1) {
//       return `${value} (${axis})`;
//     }
//     return `${value}`;
//   });
// }

// renderChart(data: any[]): void {
//   const container = this.chartContainer.nativeElement;
//   d3.select(container).selectAll('*').remove();

//   const barHeight = 40;
//   const visibleHeight = 500;
//   const outerWidth = container.offsetWidth;
//   const fullChartHeight = Math.max(data.length * barHeight + 100, visibleHeight);
//   const margin = { top: 60, right: 200, bottom: 40, left: 150 };
//   const width = outerWidth - margin.left - margin.right;
//   const height = fullChartHeight - margin.top - margin.bottom;

//   const keys = Object.keys(data[0])
//     .filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));

//   const yDomain = data.map(d => d.group);
//   const y0 = d3.scaleBand()
//     .domain(yDomain)
//     .range([0, height])
//     .paddingInner(0.2)
//     .paddingOuter(0.1);

//   const y1 = d3.scaleBand()
//     .domain(keys)
//     .range([0, y0.bandwidth()])
//     .padding(0.05);

//   const xMax = d3.max(data, d => d3.max(keys, k => d[k] || 0)) ?? 0;
//   const x = d3.scaleLinear()
//     .domain([0, xMax])
//     .nice()
//     .range([0, width]);

//   const color = d3.scaleOrdinal<string, string>()
//     .domain(keys)
//     .range(d3.schemeSet2);

//   const tooltip = this.createTooltip(container);

//   // Fixed X Axis
//   const xAxisSvg = d3.select(container)
//     .append('svg')
//     .attr('width', outerWidth)
//     .attr('height', margin.top + margin.bottom)
//     .style('display', 'block');

//   xAxisSvg.append('text')
//     .attr('x', outerWidth / 2)
//     .attr('y', margin.top / 2)
//     .attr('text-anchor', 'middle')
//     .style('font-size', '16px')
//     .style('font-weight', 'bold')
//     .text(this.label || 'clusteredbar Chart');

//   xAxisSvg.append('g')
//     .attr('transform', `translate(${margin.left},${margin.top})`)
//     .call(d3.axisBottom(x)
//       .ticks(Math.max(Math.floor(width / 80), 2))
//       .tickFormat(d3.format('~s')))
//     .selectAll('text')
//     .style('font-size', '12px');

//   xAxisSvg.append('text')
//     .attr('transform', `translate(${margin.left + width / 2},${margin.top + margin.bottom - 5})`)
//     .style('text-anchor', 'middle')
//     .style('font-size', '12px')
//     .text(this.clusteredbar_x_Axis.join(' + '));

//   // Scrollable Chart Area
//   const scrollContainer = d3.select(container)
//     .append('div')
//     .style('height', `${visibleHeight}px`)
//     .style('overflow-y', 'auto')
//     .style('position', 'relative');

//   const scrollSvg = scrollContainer
//     .append('svg')
//     .attr('width', outerWidth)
//     .attr('height', fullChartHeight);

//   const chart = scrollSvg.append('g')
//     .attr('transform', `translate(${margin.left},${margin.top})`);

//   // clusteredbars
//   const groups = chart.selectAll('g.group')
//     .data(data)
//     .join('g')
//     .attr('class', 'group')
//     .attr('transform', d => `translate(0,${y0(d.group)})`);

//   groups.selectAll('rect')
//     .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
//     .join('rect')
//     .attr('y', d => y1(d.key)!)
//     .attr('x', 0)
//     .attr('width', d => x(d.value))
//     .attr('height', y1.bandwidth())
//     .attr('fill', d => color(d.key) as string)
//     .on('mouseover', () => tooltip.style('opacity', 1))
//     .on('mousemove', (event, d) => {
//       const [mouseX, mouseY] = d3.pointer(event, container);
//       const xLabel = this.clusteredbar_y_Axis
//         .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//         .join('<br>');
//       const value = d.value;
//       tooltip.html(`
//         ${xLabel}<br>
//         <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//       `)
//         .style('left', `${mouseX + 20}px`)
//         .style('top', `${mouseY}px`);
//     })
//     .on('mouseleave', () => tooltip.style('opacity', 0))
//     .on('click', () => this.onEdit());

//   // Y Axis
//   chart.append('g')
//     .call(d3.axisLeft(y0).tickSizeOuter(0))
//     .selectAll('text')
//     .style('font-size', '12px');

//   // Y Axis Label
//   scrollSvg.append('text')
//     .attr('transform', 'rotate(-90)')
//     .attr('x', -fullChartHeight / 2)
//     .attr('y', 15)
//     .attr('text-anchor', 'middle')
//     .style('font-size', '12px')
//     .text(this.clusteredbar_y_Axis.join(' / '));

//   // Legend
//   const legend = d3.select(container)
//     .append('svg')
//     .attr('width', margin.right)
//     .attr('height', fullChartHeight)
//     .style('position', 'absolute')
//     .style('top', `${margin.top}px`)
//     .style('right', '0px');

//   const legendG = legend.append('g')
//     .attr('transform', 'translate(10, 10)');

//   keys.forEach((key, i) => {
//     const yPos = i * 20;
//     legendG.append('rect')
//       .attr('x', 0)
//       .attr('y', yPos)
//       .attr('width', 14)
//       .attr('height', 14)
//       .attr('fill', color(key) as string);

//     legendG.append('text')
//       .attr('x', 20)
//       .attr('y', yPos + 12)
//       .style('font-size', '12px')
//       .text(key);
//   });
// }


//   getSummaryStats(data: any[]): void {
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredbar_y_Axis.map((_, i) => `_x${i}`)].includes(k));
//     const values = data.flatMap(d => keys.map(k => +d[k] || 0));
//     const summary = {
//       total: d3.sum(values),
//       min: d3.min(values),
//       max: d3.max(values),
//       avg: (d3.mean(values) || 0).toFixed(2),
//     };
//     console.log(`${this.label} Summary:`, summary);
//   }

//   onEdit(): void {
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       clusteredbar_y_Axis: this.clusteredbar_y_Axis,
//       clusteredbar_x_Axis: this.clusteredbar_x_Axis,
//       clusteredbar_legend: this.clusteredbar_legend,
//       aggregationFields: this.aggregationFields,
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Clusteredbar';
//     this.aggregationFields = {};
//     this.clusteredbar_y_Axis = [];
//     this.clusteredbar_x_Axis = [];
//     this.clusteredbar_legend = [];
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;

//     if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//     this.getSummaryStats(this.aggregatedData);
//   }

//   hidethepage(): void {
//     this.onDeleteFromChild();
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//     this.onEdit();
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }

//   private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
//     return d3.select(container).append('div')
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
// }
