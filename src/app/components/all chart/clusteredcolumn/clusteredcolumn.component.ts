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
  clusteredcolumn_x_Axis: string[];
  clusteredcolumn_y_Axis: string[];
  clusteredcolumn_legend: string[];
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-clusteredcolumn',
  standalone: true,
  templateUrl: './clusteredcolumn.component.html',
  styleUrls: ['./clusteredcolumn.component.scss'],
  imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule]
})
export class ClusteredcolumnComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() label: string = 'clusteredcolumn';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() clusteredcolumn_x_Axis: string[] = [];
  @Input() clusteredcolumn_y_Axis: string[] = [];
  @Input() clusteredcolumn_legend: string[] = [];
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

      this.data2 = data.clusteredcolumn_x_Axis ?? [];
      this.data3 = data.clusteredcolumn_y_Axis ?? [];
      this.data4 = data.clusteredcolumn_legend ?? [];
      this.showCharts = false;
      this.chartData = data.data ?? [];
      this.aggregationFields = data.aggregationFields ?? {};
      this.aggregationType = data.fields[0] ?? 'Count';
      this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

      this.clusteredcolumn_x_Axis = (data.clusteredcolumn_x_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.clusteredcolumn_y_Axis = (data.clusteredcolumn_y_Axis ?? []).map((f: any) => f.split('.')[0]);
      this.clusteredcolumn_legend = (data.clusteredcolumn_legend ?? []).map((f: any) => f.split('.')[0]);

      // Handle highlighting based on activedata
      this.highlightSet.clear();
      if (data.activedata?.length && this.clusteredcolumn_x_Axis.length) {
        data.activedata.forEach((row: any) => {
          const groupKey = this.getKey(row, this.clusteredcolumn_x_Axis);
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

    const grouped = d3.groups(data, d => this.getKey(d, this.clusteredcolumn_x_Axis));
    const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredcolumn_legend))));

    return grouped.map(([groupKey, records]) => {
      const row: any = { group: groupKey, isHighlighted: this.highlightSet.has(groupKey) };
      this.clusteredcolumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
      for (const legend of legendKeys) {
        const subRecords = records.filter(r => this.getKey(r, this.clusteredcolumn_legend) === legend);
        row[legend] = this.aggregateValues(subRecords, this.clusteredcolumn_y_Axis);
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

  private formatXAxisLabel(field: string, value: any): string {
    return this.xAxisFormatters[field]?.(value) ?? String(value);
  }

  getGroupLabelLines(d: any): string[] {
    return this.clusteredcolumn_x_Axis.map((axis: any, i: number) => {
      const value = d[`_x${i}`] ?? '';
      const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
      return this.formatXAxisLabel(fieldName, value);
    });
  }

  showSwalTable(d: any): void {
    // Filter rows where x-axis group matches
    const fullData = this.chartData.filter(
      (row) => this.getKey(row, this.clusteredcolumn_x_Axis) === d.group
    );

    // Get unique x-axis values
    const uniqueValues = [...new Set(fullData.map((row) => this.getKey(row, this.clusteredcolumn_x_Axis)))];

    // Format as { xAxisFieldName: [data1, data2, ...] }
    const formattedData = {
      [this.clusteredcolumn_x_Axis.join('_')]: uniqueValues
    };

    console.log('----------formatted x-axis data----------------', formattedData);

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

    if (!data?.length || !this.clusteredcolumn_x_Axis?.length || !this.clusteredcolumn_y_Axis?.length) {
      d3.select(container)
        .append('div')
        .style('color', 'red')
        .style('text-align', 'center')
        .style('padding', '20px')
        .style('font-size', '16px')
        .text('Please select both X-Axis and Y-Axis fields to render the chart.');
      return;
    }

    const outerWidth = container.offsetWidth || 800;
    const outerHeight = container.offsetHeight || 500;
    const lineHeight = 14;
    const labelLines = this.clusteredcolumn_x_Axis.length;
    const labelHeight = labelLines * lineHeight;
    const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
    const availableHeight = Math.max(300, outerHeight);

    const xDomain = data.map(d => d.group);
    const estimatedCharWidth = 6.5;
    const MAX_ALLOWED_LABEL_WIDTH = 100;
    const allLabelLines = data.map(d => this.getGroupLabelLines(d));
    const maxLabelWidth = d3.max(allLabelLines, lines =>
      d3.max(lines.map(line => line.length * estimatedCharWidth))
    ) ?? 60;
    const labelWidth = Math.min(MAX_ALLOWED_LABEL_WIDTH, Math.max(60, maxLabelWidth));
    const minGap = 20;
    const estimatedWidth = xDomain.length * (labelWidth + minGap);
    const chartWidth = Math.max(outerWidth, estimatedWidth);

    const scrollDiv = d3.select(container)
      .append('div')
      .style('width', '100%')
      .style('overflow-x', 'auto');

    const svg = scrollDiv
      .append('svg')
      .attr('width', chartWidth)
      .attr('height', availableHeight);

    const keys = Object.keys(data[0] || {})
      .filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));

    const x0 = d3.scaleBand()
      .domain(xDomain)
      .range([margin.left, chartWidth - margin.right])
      .padding(0.2);

    const x1 = d3.scaleBand()
      .domain(keys)
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const yMax = d3.max(data, d => d3.max(keys, key => +d[key])) ?? 0;
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([availableHeight - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal<string>()
      .domain(keys)
      .range(d3.schemeSet2);

    const tooltip = this.createTooltip(container);

    svg.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(this.label || 'Clusteredcolumn Chart')
      .append('title')
      .text(`Chart Title: ${this.label || 'Clusteredcolumn Chart'}`);

    const groups = svg.selectAll('g.group')
      .data(data)
      .join('g')
      .attr('transform', d => `translate(${x0(d.group)}, 0)`);

    groups.selectAll('rect')
      .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
      .join('rect')
      .attr('x', d => x1(d.key)!)
      .attr('y', d => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', d => d.data.isHighlighted ? '#007bff' : color(d.key)) // Highlight based on isHighlighted
      .on('mouseover', () => tooltip.style('opacity', 1))
      .on('mousemove', (event, d) => {
        const [mouseX, mouseY] = d3.pointer(event, container);
        const xLabel = this.clusteredcolumn_x_Axis
          .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
          .join('<br>');
        tooltip.html(`
          ${xLabel}<br>
          <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
        `)
          .style('left', `${Math.min(mouseX + 20, chartWidth - 100)}px`)
          .style('top', `${Math.min(mouseY, availableHeight - 50)}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (_, d) => this.showSwalTable(d.data));

    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

    const xTick = xAxisGroup.selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', d => `translate(${x0(d.group)! + x0.bandwidth() / 2 - labelWidth / 2}, 0)`);

    xTick.append('foreignObject')
      .attr('x', 0)
      .attr('y', 5)
      .attr('width', labelWidth)
      .attr('height', labelHeight)
      .append('xhtml:div')
      .style('text-align', 'center')
      .style('font-size', '10px')
      .style('line-height', `${lineHeight}px`)
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('justify-content', 'center')
      .style('align-items', 'center')
      .style('height', '100%')
      .html(d => {
        const maxChars = 10;
        return `
          <div title="${this.getGroupLabelLines(d).join(' ')}">
            ${this.getGroupLabelLines(d).map(line => {
              const truncated = line.length > maxChars ? line.slice(0, maxChars - 3) + '...' : line;
              return `<div>${truncated}</div>`;
            }).join('')}
          </div>
        `;
      });

    xAxisGroup.call(d3.axisBottom(x0).tickSize(-6).tickFormat(() => ''));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));

    svg.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', availableHeight - 4)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(this.clusteredcolumn_x_Axis.join(' / '))
      .append('title')
      .text(`X Axis: ${this.clusteredcolumn_x_Axis.join(', ')}`);

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -availableHeight / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(`${this.aggregationType} (${this.clusteredcolumn_y_Axis.join(' + ')})`)
      .append('title')
      .text(`Y Axis: ${this.aggregationType} of ${this.clusteredcolumn_y_Axis.join(', ')}`);

    let legendPage = 0;
    const renderLegend = () => {
      svg.selectAll('.legend-container').remove();

      const legendWidth = chartWidth * 0.4;
      const legendItemWidth = 120;
      const itemsPerPage = Math.max(1, Math.floor(legendWidth / legendItemWidth));
      const currentKeys = keys.slice(legendPage * itemsPerPage, (legendPage + 1) * itemsPerPage);

      const legendContainer = svg.append('g')
        .attr('class', 'legend-container')
        .attr('transform', `translate(${margin.left}, ${margin.top - 50})`);

      currentKeys.forEach((key, i) => {
        const xPos = i * legendItemWidth;
        legendContainer.append('rect')
          .attr('x', xPos)
          .attr('y', 0)
          .attr('width', 14)
          .attr('height', 14)
          .attr('fill', color(key));

        legendContainer.append('text')
          .attr('x', xPos + 20)
          .attr('y', 12)
          .style('font-size', '12px')
          .text(key)
          .append('title')
          .text(`Legend: ${key}`);
      });

      if (legendPage > 0) {
        legendContainer.append('text')
          .attr('x', -25)
          .attr('y', 12)
          .attr('class', 'legend-prev')
          .style('cursor', 'pointer')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .text('<')
          .on('click', () => {
            legendPage--;
            renderLegend();
          })
          .append('title')
          .text('Previous legend items');
      }

      if ((legendPage + 1) * itemsPerPage < keys.length) {
        legendContainer.append('text')
          .attr('x', currentKeys.length * legendItemWidth)
          .attr('y', 12)
          .attr('class', 'legend-next')
          .style('cursor', 'pointer')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .text('>')
          .on('click', () => {
            legendPage++;
            renderLegend();
          })
          .append('title')
          .text('Next legend items');
      }
    };

    if (keys.length) renderLegend();
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
      clusteredcolumn_x_Axis: this.data2 ?? [],
      clusteredcolumn_y_Axis: this.data3 ?? [],
      clusteredcolumn_legend: this.data4 ?? [],
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  getSummaryStats(data: any[]): void {
    if (!data?.length) return;
    const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));
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

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) return;
    this.emitEditEvent();
  }

  onDeleteFromChild(): void {
    this.label = 'clusteredcolumn';
    this.aggregationFields = {};
    this.clusteredcolumn_x_Axis = [];
    this.clusteredcolumn_y_Axis = [];
    this.clusteredcolumn_legend = [];
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
//   clusteredcolumn_x_Axis: string[];
//   clusteredcolumn_y_Axis: string[];
//   clusteredcolumn_legend: string[];
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-clusteredcolumn',
//   standalone: true,
//   templateUrl: './clusteredcolumn.component.html',
//   styleUrls: ['./clusteredcolumn.component.scss'],
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule]
// })
// export class ClusteredcolumnComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
//   @Input() label: string = 'clusteredcolumn';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() clusteredcolumn_x_Axis: string[] = [];
//   @Input() clusteredcolumn_y_Axis: string[] = [];
//   @Input() clusteredcolumn_legend: string[] = [];
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

//       this.data2 = data.clusteredcolumn_x_Axis ?? [];
//       this.data3 = data.clusteredcolumn_y_Axis ?? [];
//       this.data4 = data.clusteredcolumn_legend ?? [];
//       this.showCharts = false;
//       this.chartData = data.data ?? [];
//       this.aggregationFields = data.aggregationFields ?? {};
//       this.aggregationType = data.fields[0] ?? 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

//       this.clusteredcolumn_x_Axis = (data.clusteredcolumn_x_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.clusteredcolumn_y_Axis = (data.clusteredcolumn_y_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.clusteredcolumn_legend = (data.clusteredcolumn_legend ?? []).map((f: any) => f.split('.')[0]);

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

//     const grouped = d3.groups(data, d => this.getKey(d, this.clusteredcolumn_x_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredcolumn_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.clusteredcolumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.clusteredcolumn_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.clusteredcolumn_y_Axis);
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

//   private formatXAxisLabel(field: string, value: any): string {
//     return this.xAxisFormatters[field]?.(value) ?? String(value);
//   }

//   getGroupLabelLines(d: any): string[] {
//     return this.clusteredcolumn_x_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       return this.formatXAxisLabel(fieldName, value);
//     });
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer) return;

//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();

//     if (!data?.length || !this.clusteredcolumn_x_Axis?.length || !this.clusteredcolumn_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('color', 'red')
//         .style('text-align', 'center')
//         .style('padding', '20px')
//         .style('font-size', '16px')
//         .text('Please select both X-Axis and Y-Axis fields to render the chart.');
//       return;
//     }

//     const outerWidth = container.offsetWidth || 800;
//     const outerHeight = container.offsetHeight || 500;
//     const lineHeight = 14;
//     const labelLines = this.clusteredcolumn_x_Axis.length;
//     const labelHeight = labelLines * lineHeight;
//     const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
//     const availableHeight = Math.max(300, outerHeight);

//     const xDomain = data.map(d => d.group);
//     const estimatedCharWidth = 6.5;
//     const MAX_ALLOWED_LABEL_WIDTH = 100;
//     const allLabelLines = data.map(d => this.getGroupLabelLines(d));
//     const maxLabelWidth = d3.max(allLabelLines, lines =>
//       d3.max(lines.map(line => line.length * estimatedCharWidth))
//     ) ?? 60;
//     const labelWidth = Math.min(MAX_ALLOWED_LABEL_WIDTH, Math.max(60, maxLabelWidth));
//     const minGap = 20;
//     const estimatedWidth = xDomain.length * (labelWidth + minGap);
//     const chartWidth = Math.max(outerWidth, estimatedWidth);

//     const scrollDiv = d3.select(container)
//       .append('div')
//       .style('width', '100%')
//       .style('overflow-x', 'auto');

//     const svg = scrollDiv
//       .append('svg')
//       .attr('width', chartWidth)
//       .attr('height', availableHeight);

//     const keys = Object.keys(data[0] || {})
//       .filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));

//     const x0 = d3.scaleBand()
//       .domain(xDomain)
//       .range([margin.left, chartWidth - margin.right])
//       .padding(0.2);

//     const x1 = d3.scaleBand()
//       .domain(keys)
//       .range([0, x0.bandwidth()])
//       .padding(0.05);

//     const yMax = d3.max(data, d => d3.max(keys, key => +d[key])) ?? 0;
//     const y = d3.scaleLinear()
//       .domain([0, yMax])
//       .nice()
//       .range([availableHeight - margin.bottom, margin.top]);

//     const color = d3.scaleOrdinal<string>()
//       .domain(keys)
//       .range(d3.schemeSet2);

//     const tooltip = this.createTooltip(container);

//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', 20)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '16px')
//       .style('font-weight', 'bold')
//       .text(this.label || 'Clusteredcolumn Chart')
//       .append('title')
//       .text(`Chart Title: ${this.label || 'Clusteredcolumn Chart'}`);

//     const groups = svg.selectAll('g.group')
//       .data(data)
//       .join('g')
//       .attr('transform', d => `translate(${x0(d.group)}, 0)`);

//     groups.selectAll('rect')
//       .data(d => keys.map(key => ({ key, value: d[key] || 0, data: d })))
//       .join('rect')
//       .attr('x', d => x1(d.key)!)
//       .attr('y', d => y(d.value))
//       .attr('width', x1.bandwidth())
//       .attr('height', d => y(0) - y(d.value))
//       .attr('fill', d => color(d.key))
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabel = this.clusteredcolumn_x_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         tooltip.html(`
//           ${xLabel}<br>
//           <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
//         `)
//           .style('left', `${Math.min(mouseX + 20, chartWidth - 100)}px`)
//           .style('top', `${Math.min(mouseY, availableHeight - 50)}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.emitEditEvent());

//     const xAxisGroup = svg.append('g')
//       .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

//     const xTick = xAxisGroup.selectAll('g')
//       .data(data)
//       .join('g')
//       .attr('transform', d => `translate(${x0(d.group)! + x0.bandwidth() / 2 - labelWidth / 2}, 0)`);

//     xTick.append('foreignObject')
//       .attr('x', 0)
//       .attr('y', 5)
//       .attr('width', labelWidth)
//       .attr('height', labelHeight)
//       .append('xhtml:div')
//       .style('text-align', 'center')
//       .style('font-size', '10px')
//       .style('line-height', `${lineHeight}px`)
//       .style('display', 'flex')
//       .style('flex-direction', 'column')
//       .style('justify-content', 'center')
//       .style('align-items', 'center')
//       .style('height', '100%')
//       .html(d => {
//         const maxChars = 10;
//         return `
//           <div title="${this.getGroupLabelLines(d).join(' ')}">
//             ${this.getGroupLabelLines(d).map(line => {
//               const truncated = line.length > maxChars ? line.slice(0, maxChars - 3) + '...' : line;
//               return `<div>${truncated}</div>`;
//             }).join('')}
//           </div>
//         `;
//       });

//     xAxisGroup.call(d3.axisBottom(x0).tickSize(-6).tickFormat(() => ''));

//     svg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));

//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', availableHeight - 4)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(this.clusteredcolumn_x_Axis.join(' / '))
//       .append('title')
//       .text(`X Axis: ${this.clusteredcolumn_x_Axis.join(', ')}`);

//     svg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -availableHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(`${this.aggregationType} (${this.clusteredcolumn_y_Axis.join(' + ')})`)
//       .append('title')
//       .text(`Y Axis: ${this.aggregationType} of ${this.clusteredcolumn_y_Axis.join(', ')}`);

//     let legendPage = 0;
//     const renderLegend = () => {
//       svg.selectAll('.legend-container').remove();

//       const legendWidth = chartWidth * 0.4;
//       const legendItemWidth = 120;
//       const itemsPerPage = Math.max(1, Math.floor(legendWidth / legendItemWidth));
//       const currentKeys = keys.slice(legendPage * itemsPerPage, (legendPage + 1) * itemsPerPage);

//       const legendContainer = svg.append('g')
//         .attr('class', 'legend-container')
//         .attr('transform', `translate(${margin.left}, ${margin.top - 50})`);

//       currentKeys.forEach((key, i) => {
//         const xPos = i * legendItemWidth;
//         legendContainer.append('rect')
//           .attr('x', xPos)
//           .attr('y', 0)
//           .attr('width', 14)
//           .attr('height', 14)
//           .attr('fill', color(key));

//         legendContainer.append('text')
//           .attr('x', xPos + 20)
//           .attr('y', 12)
//           .style('font-size', '12px')
//           .text(key)
//           .append('title')
//           .text(`Legend: ${key}`);
//       });

//       if (legendPage > 0) {
//         legendContainer.append('text')
//           .attr('x', -25)
//           .attr('y', 12)
//           .attr('class', 'legend-prev')
//           .style('cursor', 'pointer')
//           .style('font-size', '14px')
//           .style('font-weight', 'bold')
//           .text('<')
//           .on('click', () => {
//             legendPage--;
//             renderLegend();
//           })
//           .append('title')
//           .text('Previous legend items');
//       }

//       if ((legendPage + 1) * itemsPerPage < keys.length) {
//         legendContainer.append('text')
//           .attr('x', currentKeys.length * legendItemWidth)
//           .attr('y', 12)
//           .attr('class', 'legend-next')
//           .style('cursor', 'pointer')
//           .style('font-size', '14px')
//           .style('font-weight', 'bold')
//           .text('>')
//           .on('click', () => {
//             legendPage++;
//             renderLegend();
//           })
//           .append('title')
//           .text('Next legend items');
//       }
//     };

//     if (keys.length) renderLegend();
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
//       clusteredcolumn_x_Axis: this.data2 ?? [],
//       clusteredcolumn_y_Axis: this.data3 ?? [],
//       clusteredcolumn_legend: this.data4 ?? [],
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   getSummaryStats(data: any[]): void {
//     if (!data?.length) return;
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));
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

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//     this.emitEditEvent();
//   }

//   onDeleteFromChild(): void {
//     this.label = 'clusteredcolumn';
//     this.aggregationFields = {};
//     this.clusteredcolumn_x_Axis = [];
//     this.clusteredcolumn_y_Axis = [];
//     this.clusteredcolumn_legend = [];
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

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }
// }
















// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit,
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
//   clusteredcolumn_x_Axis: string[];
//   clusteredcolumn_y_Axis: string[];
//   clusteredcolumn_legend: string[];
//   uniqueIddata: any,
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }
// export interface deleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
//}

// @Component({
//   selector: 'app-clusteredcolumn',
//   standalone: true,
//   templateUrl: './clusteredcolumn.component.html',
//   styleUrls: ['./clusteredcolumn.component.scss'],
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
// })
// export class ClusteredcolumnComponent implements OnInit, OnDestroy, AfterViewInit {
//   @Input() label: string = 'clusteredcolumn';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() clusteredcolumn_x_Axis: string[] = [];
//   @Input() clusteredcolumn_y_Axis: string[] = [];
//   @Input() clusteredcolumn_legend: string[] = [];
//   @Input() uniqueId: any = '';
//   @Input() showCharts: boolean = true;
//   @Input() title: string = '';
//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<deleteChartEdits>();
//   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
//   @Output() deleteChart = new EventEmitter<number>();
//   chartData: any[] = [];
//   aggregatedData: any[] = [];
//   aggregationType: string = 'Count';
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
//         this.showCharts = false;
//         this.chartData = data.data || [];
//         this.aggregationFields = data.aggregationFields || {};
//         this.aggregationType = data.aggregation || 'Count';
//         this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] || '';

//         this.clusteredcolumn_x_Axis = (data.clusteredcolumn_x_Axis || []).map((f: any) => f.split('.')[0]);
//         this.clusteredcolumn_y_Axis = (data.clusteredcolumn_y_Axis || []).map((f: any) => f.split('.')[0]);
//         this.clusteredcolumn_legend = (data.clusteredcolumn_legend || []).map((f: any) => f.split('.')[0]);

//         this.aggregatedData = this.aggregateData(this.chartData);
//         if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//         this.getSummaryStats(this.aggregatedData);
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

//   private getKey(d: any, fields: string[]): string {
//     return fields.map(f => d[f]).join(' | ');
//   }

//   private aggregateData(data: any[]): any[] {
//     const grouped = d3.groups(data, d => this.getKey(d, this.clusteredcolumn_x_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.clusteredcolumn_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.clusteredcolumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0][f]);

//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.clusteredcolumn_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.clusteredcolumn_y_Axis);
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

//   private formatXAxisLabel(field: string, value: any): string {
//     return this.xAxisFormatters[field]?.(value) ?? value;
//   }

//   getGroupLabelLines(d: any): string[] {
//     return this.clusteredcolumn_x_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const isLast = i === this.clusteredcolumn_x_Axis.length - 1;

//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       const funcName = typeof axis === 'object' && axis?.func ? axis.func.toUpperCase() : '';

//       if (isLast && funcName) {
//         return `${value}`;
//       }

//       return `${value}`;
//     });
//   }

//   // This formats the group label (e.g., function name) for wrapping or truncation
//   // private formatFunctionName(name: string): string[] {
//   //   const maxCharsPerLine = 12;
//   //   const maxTotalLength = 36;

//   //   if (name.length > maxTotalLength) {
//   //     return [name.slice(0, maxTotalLength) + '...'];
//   //   }

//   //   const lines = [];
//   //   for (let i = 0; i < name.length; i += maxCharsPerLine) {
//   //     lines.push(name.slice(i, i + maxCharsPerLine));
//   //   }
//   //   return lines;
//   // }

//   // This fetches the formatted label for the group (supports multi-line)
//   // private getGroupLabelLines(d: any): string[] {
//   //   return this.formatFunctionName(d.group);
//   // }


//   renderChart(data: any[]): void {
//     const container = this.chartContainer.nativeElement;

//     // Clear previous chart
//     d3.select(container).selectAll('*').remove();

//     if (
//       !data || data.length === 0 ||
//       !this.clusteredcolumn_x_Axis?.length ||
//       !this.clusteredcolumn_y_Axis?.length
//     ) {
//       d3.select(container)
//         .append('div')
//         .style('color', 'red')
//         .style('text-align', 'center')
//         .style('padding', '20px')
//         .text('Please select both X-Axis and Y-Axis fields to render the chart.');
//       return;
//     }

//     const outerWidth = container.offsetWidth;
//     const outerHeight = container.offsetHeight || 500;
//     const lineHeight = 14;
//     const labelLines = this.clusteredcolumn_x_Axis.length;
//     const labelHeight = labelLines * lineHeight;
//     const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
//     const availableHeight = Math.max(300, outerHeight);

//     const xDomain = data.map(d => d.group);

//     const estimatedCharWidth = 6.5;
//     const MAX_ALLOWED_LABEL_WIDTH = 100;
//     const allLabelLines = data.map(d => this.getGroupLabelLines(d));
//     const maxLabelWidth = d3.max(allLabelLines, lines =>
//       d3.max(lines.map(line => line.length * estimatedCharWidth))
//     ) ?? 60;
//     const labelWidth = Math.min(MAX_ALLOWED_LABEL_WIDTH, Math.max(60, maxLabelWidth));
//     const minGap = 20;
//     const estimatedWidth = xDomain.length * (labelWidth + minGap);
//     const chartWidth = Math.max(outerWidth, estimatedWidth);

//     const scrollDiv = d3.select(container)
//       .append('div')
//       .style('width', '100%')
//       .style('overflow-x', 'auto');

//     const svg = scrollDiv.append('svg')
//       .attr('width', chartWidth)
//       .attr('height', availableHeight);

//     const keys = Object.keys(data[0])
//       .filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));

//     // Scales
//     const x0 = d3.scaleBand()
//       .domain(xDomain)
//       .range([margin.left, chartWidth - margin.right])
//       .padding(0.2);

//     const x1 = d3.scaleBand()
//       .domain(keys)
//       .range([0, x0.bandwidth()])
//       .padding(0.05);

//     const yMax = d3.max(data, d => d3.max(keys, key => +d[key])) ?? 0;

//     const y = d3.scaleLinear()
//       .domain([0, yMax])
//       .nice()
//       .range([availableHeight - margin.bottom, margin.top]);

//     const color = d3.scaleOrdinal<string>()
//       .domain(keys)
//       .range(d3.schemeSet2);

//     const tooltip = this.createTooltip(container);

//     // Chart Title
//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', 20)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '16px')
//       .style('font-weight', 'bold')
//       .text(this.label || 'clusteredcolumn Chart')
//       .append('title')
//       .text(`Chart Title: ${this.label || 'clusteredcolumn Chart'}`);

//     // Bars
//     const groups = svg.selectAll('g.group')
//       .data(data)
//       .enter()
//       .append('g')
//       .attr('transform', d => `translate(${x0(d.group)}, 0)`);

//     groups.selectAll('rect')
//       .data(d => keys.map(key => ({ key, value: d[key], data: d })))
//       .enter()
//       .append('rect')
//       .attr('x', d => x1(d.key)!)
//       .attr('y', d => y(d.value))
//       .attr('width', x1.bandwidth())
//       .attr('height', d => y(0) - y(d.value))
//       .attr('fill', d => color(d.key))
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabel = this.clusteredcolumn_x_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         tooltip.html(`
//         ${xLabel}<br>
//         <strong>${d.key} (${this.aggregationType}):</strong> ${d.value?.toFixed?.(2) ?? d.value}
//       `)
//           .style('left', `${mouseX + 20}px`)
//           .style('top', `${mouseY}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => {
//         this.editClicked.emit({
//           label: this.label,
//           aggregationFieldKey: this.aggregationFieldKey,
//           aggregationType: this.aggregationType,
//           clusteredcolumn_x_Axis: this.clusteredcolumn_x_Axis,
//           clusteredcolumn_y_Axis: this.clusteredcolumn_y_Axis,
//           clusteredcolumn_legend: this.clusteredcolumn_legend,
//              uniqueIddata:this.uniqueId,
//           aggregationFields: this.aggregationFields,
//           selectchartfunction: true
//         });
//       });

//     // X-Axis Labels
//     const xAxisGroup = svg.append('g')
//       .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

//     const xTick = xAxisGroup.selectAll('g')
//       .data(data)
//       .enter()
//       .append('g')
//       .attr('transform', d => `translate(${x0(d.group)! + x0.bandwidth() / 2 - labelWidth / 2}, 0)`);

//     xTick.append('foreignObject')
//       .attr('x', 0)
//       .attr('y', 5)
//       .attr('width', labelWidth)
//       .attr('height', labelHeight)
//       .append('xhtml:div')
//       .style('text-align', 'center')
//       .style('font-size', '10px')
//       .style('line-height', `${lineHeight}px`)
//       .style('display', 'flex')
//       .style('flex-direction', 'column')
//       .style('justify-content', 'center')
//       .style('align-items', 'center')
//       .style('height', '100%')
//       .html(d => {
//         const maxChars = 10;
//         return `
//         <div title="${this.getGroupLabelLines(d).join(' ')}">
//           ${this.getGroupLabelLines(d).map(line => {
//           const truncated = line.length > maxChars ? line.slice(0, maxChars - 3) + '...' : line;
//           return `<div>${truncated}</div>`;
//         }).join('')}
//         </div>
//       `;
//       });

//     xAxisGroup.call(d3.axisBottom(x0).tickSize(-6).tickFormat(() => ''));

//     // Y Axis
//     svg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));

//     // Axis Labels
//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', availableHeight - 4)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(this.clusteredcolumn_x_Axis.join(' / '))
//       .append('title')
//       .text(`X Axis: ${this.clusteredcolumn_x_Axis.join(', ')}`);

//     svg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -availableHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(`${this.aggregationType} (${this.clusteredcolumn_y_Axis.join(' + ')})`)
//       .append('title')
//       .text(`Y Axis: ${this.aggregationType} of ${this.clusteredcolumn_y_Axis.join(', ')}`);

//     // Legend with Pagination
//     let legendPage = 0;

//     const renderLegend = () => {
//       // Remove any existing legend
//       svg.selectAll('.legend-container').remove();

//       // Define legend width and number of items per page
//       const legendWidth = chartWidth * 0.4;
//       const legendItemWidth = 120;
//       const itemsPerPage = Math.max(1, Math.floor(legendWidth / legendItemWidth));

//       // Get the keys for the current page
//       const currentKeys = keys.slice(
//         legendPage * itemsPerPage,
//         (legendPage + 1) * itemsPerPage
//       );

//       // Create a group container for the legend
//       const legendContainer = svg.append('g')
//         .attr('class', 'legend-container')
//         .attr('transform', `translate(${margin.left}, ${margin.top - 50})`);

//       // Add legend items (rect and text)
//       currentKeys.forEach((key, i) => {
//         const xPos = i * legendItemWidth;

//         legendContainer.append('rect')
//           .attr('x', xPos)
//           .attr('y', 0)
//           .attr('width', 14)
//           .attr('height', 14)
//           .attr('fill', color(key));

//         legendContainer.append('text')
//           .attr('x', xPos + 20)
//           .attr('y', 12)
//           .style('font-size', '12px')
//           .text(key)
//           .append('title')
//           .text(`Legend: ${key}`);
//       });

//       // Add "<" button if not on first page
//       if (legendPage > 0) {
//         legendContainer.append('text')
//           .attr('x', -25)
//           .attr('y', 12)
//           .attr('class', 'legend-prev')
//           .style('cursor', 'pointer')
//           .style('font-size', '14px')
//           .style('font-weight', 'bold')
//           .text('<')
//           .on('click', () => {
//             legendPage--;
//             renderLegend();
//           })
//           .append('title')
//           .text('Previous legend items');
//       }

//       // Add ">" button if more pages are available
//       if ((legendPage + 1) * itemsPerPage < keys.length) {
//         legendContainer.append('text')
//           .attr('x', currentKeys.length * legendItemWidth)
//           .attr('y', 12)
//           .attr('class', 'legend-next')
//           .style('cursor', 'pointer')
//           .style('font-size', '14px')
//           .style('font-weight', 'bold')
//           .text('>')
//           .on('click', () => {
//             legendPage++;
//             renderLegend();
//           })
//           .append('title')
//           .text('Next legend items');
//       }
//     };

//     renderLegend();

//     // Responsive
//     window.addEventListener('resize', () => this.renderChart(data));
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


//   getSummaryStats(data: any[]): void {
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.clusteredcolumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));
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
//       clusteredcolumn_x_Axis: this.clusteredcolumn_x_Axis,
//       clusteredcolumn_y_Axis: this.clusteredcolumn_y_Axis,
//       clusteredcolumn_legend: this.clusteredcolumn_legend,
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }
//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (
//       target.closest('.delete-button') ||
//       target.closest('.example-handle')
//     ) {
//       return;
//     }

//     console.log('Chart container clicked!');
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       clusteredcolumn_x_Axis: this.clusteredcolumn_x_Axis,
//       clusteredcolumn_y_Axis: this.clusteredcolumn_y_Axis,
//       clusteredcolumn_legend: this.clusteredcolumn_legend,
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'clusteredcolumn';
//     this.aggregationFields = {};
//     this.clusteredcolumn_x_Axis = [];
//     this.clusteredcolumn_y_Axis = [];
//     this.clusteredcolumn_legend = [];
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


//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }
// }
