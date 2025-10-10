import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
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
  StackedColumn_x_Axis: string[];
  StackedColumn_y_Axis: string[];
  StackedColumn_legend: string[];
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-stackedcolumn',
  standalone: true,
  templateUrl: './stackedcolumn.component.html',
  styleUrls: ['./stackedcolumn.component.scss'],
  imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
})
export class StackedcolumnComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() label: string = 'StackedColumn';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() StackedColumn_x_Axis: string[] = [];
  @Input() StackedColumn_y_Axis: string[] = [];
  @Input() StackedColumn_legend: string[] = [];
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

  itchartdata(): void {
    this.dataSubscription = this.coreService.getChartData(this.label).subscribe({
      next: (data) => {
        if (!data || this.uniqueId !== data.uniqueIddata) return;

        console.log('Received data:', data);
        console.log('Received uniqueIddata:', data.uniqueIddata);
        console.log('Received field:', data.fields[0]);
        console.log('Activedata data:', data.activedata);

        this.data2 = data.StackedColumn_x_Axis ?? [];
        this.data3 = data.StackedColumn_y_Axis ?? [];
        this.data4 = data.StackedColumn_legend ?? [];
        this.showCharts = false;
        this.chartData = data.data ?? [];
        this.aggregationFields = data.aggregationFields ?? {};
        this.aggregationType = data.fields[0] ?? 'Count';
        this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

        this.StackedColumn_x_Axis = (data.StackedColumn_x_Axis ?? []).map((f: any) => f.split('.')[0]);
        this.StackedColumn_y_Axis = (data.StackedColumn_y_Axis ?? []).map((f: any) => f.split('.')[0]);
        this.StackedColumn_legend = (data.StackedColumn_legend ?? []).map((f: any) => f.split('.')[0]);

        this.highlightSet.clear();
        if (data.activedata?.length && this.StackedColumn_x_Axis.length) {
          data.activedata.forEach((row: any) => {
            const key = this.getKey(row, this.StackedColumn_x_Axis);
            this.highlightSet.add(key);
          });
        }

        this.aggregatedData = this.aggregateData(this.chartData);
        if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
        this.getSummaryStats(this.aggregatedData);
      },
      error: (err) => {
        console.error('Error fetching chart data:', err);
      }
    });
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

  private getKey(d: any, fields: string[]): string {
    return fields.map(f => d[f] ?? '').join(' | ');
  }

  private aggregateData(data: any[]): any[] {
    if (!data || !data.length) return [];

    const grouped = d3.groups(data, d => this.getKey(d, this.StackedColumn_x_Axis));
    const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.StackedColumn_legend))));

    return grouped.map(([groupKey, records]) => {
      const row: any = { group: groupKey };
      this.StackedColumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
      for (const legend of legendKeys) {
        const subRecords = records.filter(r => this.getKey(r, this.StackedColumn_legend) === legend);
        row[legend] = this.aggregateValues(subRecords, this.StackedColumn_y_Axis);
      }
      row.isHighlighted = this.highlightSet.has(groupKey);
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
    return this.StackedColumn_x_Axis.map((axis: any, i: number) => {
      const value = d[`_x${i}`] ?? '';
      const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
      return this.formatXAxisLabel(fieldName, value);
    });
  }

  showSwalTable(d: any): void {
    const xKeys = this.StackedColumn_x_Axis;
    const filterObj: any = {};
    xKeys.forEach((key, i) => {
      filterObj[key] = d[`_x${i}`];
    });

    const fullData = this.chartData.filter(row => {
      return xKeys.every(key => row[key] === filterObj[key]);
    });

    const formattedData: any = {};
    xKeys.forEach(key => {
      const uniqueVals = [...new Set(fullData.map(row => row[key]))];
      formattedData[key] = uniqueVals;
    });

    console.log('----------formatted x-axis data----------------', formattedData);

    this.coreService.Onpostrelationdata(formattedData);

    this.activedata = [...fullData];
    this.itchartdata();
  }

  renderChart(data: any[]): void {
    if (!this.chartContainer) return;

    const container = this.chartContainer.nativeElement;
    d3.select(container).selectAll('*').remove();

    if (!data?.length || !this.StackedColumn_x_Axis?.length || !this.StackedColumn_y_Axis?.length) {
      d3.select(container)
        .append('div')
        .style('color', 'red')
        .style('text-align', 'center')
        .style('padding', '20px')
        .text('Please select both X-Axis and Y-Axis fields to render the chart.');
      return;
    }

    const outerWidth = container.offsetWidth || 800;
    const outerHeight = container.offsetHeight || 500;
    const lineHeight = 14;
    const labelLines = this.StackedColumn_x_Axis.length;
    const labelHeight = labelLines * lineHeight;
    const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
    const availableHeight = Math.max(300, outerHeight);

    const xDomain = data.map(d => d.group);
    const estimatedCharWidth = 6.5;
    const MAX_ALLOWED_LABEL_WIDTH = 100;
    const allLabelLines = data.map(d => this.getGroupLabelLines(d));
    const maxLabelWidth = d3.max(allLabelLines, lines =>
      d3.max(lines.map(line => line.length * estimatedCharWidth)) ?? 60
    ) ?? 60;
    const labelWidth = Math.min(MAX_ALLOWED_LABEL_WIDTH, Math.max(60, maxLabelWidth));
    const minGap = 20;
    const estimatedWidth = xDomain.length * (labelWidth + minGap);
    const chartWidth = Math.max(outerWidth, estimatedWidth);

    const scrollDiv = d3.select(container)
      .append('div')
      .style('width', '100%')
      .style('overflow-x', 'auto');

    const svg = scrollDiv.append('svg')
      .attr('width', chartWidth)
      .attr('height', availableHeight);

    const x = d3.scaleBand()
      .domain(xDomain)
      .range([margin.left, chartWidth - margin.right])
      .padding(0.2);

    const keys = Object.keys(data[0] || {})
      .filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));

    const stackedData = d3.stack<any>().keys(keys)(data);
    const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) ?? 0;

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
      .text(this.label || 'StackedColumn Chart')
      .append('title')
      .text(`Chart Title: ${this.label || 'StackedColumn Chart'}`);

    const group = svg.append('g')
      .selectAll('g.layer')
      .data(stackedData)
      .join('g')
      .attr('class', 'layer')
      .attr('fill', d => color(d.key) as string);

    group.selectAll('rect')
      .data(d => d.map(p => ({ ...p, key: d.key, data: p.data })))
      .join('rect')
      .attr('x', d => x(d.data.group)!)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('fill', d => d.data.isHighlighted ? color(d.key) as string : '#ccc')
      .on('mouseover', () => tooltip.style('opacity', 1))
      .on('mousemove', (event, d) => {
        const [mouseX, mouseY] = d3.pointer(event, container);
        const xLabel = this.StackedColumn_x_Axis
          .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
          .join('<br>');
        const value = d.data[d.key];
        tooltip.html(`
          ${xLabel}<br>
          <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
        `)
          .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
          .style('top', `${Math.min(mouseY, outerHeight - 50)}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event, d) => {
        this.showSwalTable(d.data);
        event.stopPropagation();
      });

    const splitIndex = this.StackedColumn_x_Axis.length - 1;
    if (splitIndex >= 0) {
      const groupBy = d3.groups(data, d => d[`_x${splitIndex}`]);
      groupBy.forEach(([, items], i) => {
        if (i === 0) return;
        const xPos = x(items[0].group);
        if (xPos !== undefined) {
          svg.append('line')
            .attr('x1', xPos - x.bandwidth() / 2)
            .attr('x2', xPos - x.bandwidth() / 2)
            .attr('y1', margin.top)
            .attr('y2', availableHeight - margin.bottom)
            .attr('stroke', '#ccc')
            .attr('stroke-dasharray', '4');
        }
      });
    }

    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

    const xTick = xAxisGroup.selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${x(d.group)! + x.bandwidth() / 2 - labelWidth / 2}, 0)`);

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

    xAxisGroup.call(d3.axisBottom(x).tickSize(-6).tickFormat(() => ''));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));

    svg.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', availableHeight - 4)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(this.StackedColumn_x_Axis.join(' / '))
      .append('title')
      .text(`X Axis: ${this.StackedColumn_x_Axis.join(', ')}`);

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -availableHeight / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(`${this.aggregationType} (${this.StackedColumn_y_Axis.join(' + ')})`)
      .append('title')
      .text(`Y Axis: ${this.aggregationType} of ${this.StackedColumn_y_Axis.join(', ')}`);

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

    window.addEventListener('resize', () => this.renderChart(data));
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
      StackedColumn_x_Axis: this.data2 ?? [],
      StackedColumn_y_Axis: this.data3 ?? [],
      StackedColumn_legend: this.data4 ?? [],
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  getSummaryStats(data: any[]): void {
    if (!data?.length) return;
    const keys = Object.keys(data[0]).filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`), 'isHighlighted'].includes(k));
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

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) return;
    this.emitEditEvent();
  }

  onDeleteFromChild(): void {
    this.label = 'StackedColumn';
    this.aggregationFields = {};
    this.StackedColumn_x_Axis = [];
    this.StackedColumn_y_Axis = [];
    this.StackedColumn_legend = [];
    this.aggregationType = '';
    this.chartData = [];
    this.aggregatedData = [];
    this.activedata = [];
    this.showCharts = true;
    this.highlightSet.clear();
    this.editClickeds.emit({
      label: this.label,
      selectchartfunction: false
    });
    this.deleteChart.emit(this.uniqueId);
    if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
    this.getSummaryStats(this.aggregatedData);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', () => this.renderChart(this.aggregatedData));
  }
}









































// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit,
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
//   StackedColumn_x_Axis: string[];
//   StackedColumn_y_Axis: string[];
//   StackedColumn_legend: string[];
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-stackedcolumn',
//   standalone: true,
//   templateUrl: './stackedcolumn.component.html',
//   styleUrls: ['./stackedcolumn.component.scss'],
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
// })
// export class StackedcolumnComponent implements OnInit, OnDestroy, AfterViewInit {
//   @Input() label: string = 'StackedColumn';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() StackedColumn_x_Axis: string[] = [];
//   @Input() StackedColumn_y_Axis: string[] = [];
//   @Input() StackedColumn_legend: string[] = [];
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

//   itchartdata(): void {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//       if (!data || this.uniqueId !== data.uniqueIddata) return;

//       this.data2 = data.StackedColumn_x_Axis ?? [];
//       this.data3 = data.StackedColumn_y_Axis ?? [];
//       this.data4 = data.StackedColumn_legend ?? [];
//       this.showCharts = false;
//       this.chartData = data.data ?? [];
//       this.aggregationFields = data.aggregationFields ?? {};
//       this.aggregationType = data.fields[0] ?? 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] ?? '';

//       this.StackedColumn_x_Axis = (data.StackedColumn_x_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.StackedColumn_y_Axis = (data.StackedColumn_y_Axis ?? []).map((f: any) => f.split('.')[0]);
//       this.StackedColumn_legend = (data.StackedColumn_legend ?? []).map((f: any) => f.split('.')[0]);

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
//     if (!data || !data.length) return [];

//     const grouped = d3.groups(data, d => this.getKey(d, this.StackedColumn_x_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.StackedColumn_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.StackedColumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0]?.[f] ?? '');
//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.StackedColumn_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.StackedColumn_y_Axis);
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
//     return this.StackedColumn_x_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       return this.formatXAxisLabel(fieldName, value);
//     });
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer) return;

//     const container = this.chartContainer.nativeElement;
//     d3.select(container).selectAll('*').remove();

//     if (!data?.length || !this.StackedColumn_x_Axis?.length || !this.StackedColumn_y_Axis?.length) {
//       d3.select(container)
//         .append('div')
//         .style('color', 'red')
//         .style('text-align', 'center')
//         .style('padding', '20px')
//         .text('Please select both X-Axis and Y-Axis fields to render the chart.');
//       return;
//     }

//     const outerWidth = container.offsetWidth || 800;
//     const outerHeight = container.offsetHeight || 500;
//     const lineHeight = 14;
//     const labelLines = this.StackedColumn_x_Axis.length;
//     const labelHeight = labelLines * lineHeight;
//     const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
//     const availableHeight = Math.max(300, outerHeight);

//     const xDomain = data.map(d => d.group);
//     const estimatedCharWidth = 6.5;
//     const MAX_ALLOWED_LABEL_WIDTH = 100;
//     const allLabelLines = data.map(d => this.getGroupLabelLines(d));
//     const maxLabelWidth = d3.max(allLabelLines, lines =>
//       d3.max(lines.map(line => line.length * estimatedCharWidth)) ?? 60
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

//     const x = d3.scaleBand()
//       .domain(xDomain)
//       .range([margin.left, chartWidth - margin.right])
//       .padding(0.2);

//     const keys = Object.keys(data[0] || {})
//       .filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));

//     const stackedData = d3.stack<any>().keys(keys)(data);
//     const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) ?? 0;

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
//       .text(this.label || 'StackedColumn Chart')
//       .append('title')
//       .text(`Chart Title: ${this.label || 'StackedColumn Chart'}`);

//     const group = svg.append('g')
//       .selectAll('g.layer')
//       .data(stackedData)
//       .join('g')
//       .attr('class', 'layer')
//       .attr('fill', d => color(d.key) as string);

//     group.selectAll('rect')
//       .data(d => d.map(p => ({ ...p, key: d.key, data: p.data })))
//       .join('rect')
//       .attr('x', d => x(d.data.group)!)
//       .attr('y', d => y(d[1]))
//       .attr('height', d => y(d[0]) - y(d[1]))
//       .attr('width', x.bandwidth())
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabel = this.StackedColumn_x_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         const value = d.data[d.key];
//         tooltip.html(`
//           ${xLabel}<br>
//           <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
//         `)
//           .style('left', `${Math.min(mouseX + 20, outerWidth - 100)}px`)
//           .style('top', `${Math.min(mouseY, outerHeight - 50)}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', () => this.emitEditEvent());

//     const splitIndex = this.StackedColumn_x_Axis.length - 1;
//     if (splitIndex >= 0) {
//       const groupBy = d3.groups(data, d => d[`_x${splitIndex}`]);
//       groupBy.forEach(([, items], i) => {
//         if (i === 0) return;
//         const xPos = x(items[0].group);
//         if (xPos !== undefined) {
//           svg.append('line')
//             .attr('x1', xPos - x.bandwidth() / 2)
//             .attr('x2', xPos - x.bandwidth() / 2)
//             .attr('y1', margin.top)
//             .attr('y2', availableHeight - margin.bottom)
//             .attr('stroke', '#ccc')
//             .attr('stroke-dasharray', '4');
//         }
//       });
//     }

//     const xAxisGroup = svg.append('g')
//       .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

//     const xTick = xAxisGroup.selectAll('g')
//       .data(data)
//       .enter()
//       .append('g')
//       .attr('transform', d => `translate(${x(d.group)! + x.bandwidth() / 2 - labelWidth / 2}, 0)`);

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

//     xAxisGroup.call(d3.axisBottom(x).tickSize(-6).tickFormat(() => ''));

//     svg.append('g')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));

//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', availableHeight - 4)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(this.StackedColumn_x_Axis.join(' / '))
//       .append('title')
//       .text(`X Axis: ${this.StackedColumn_x_Axis.join(', ')}`);

//     svg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -availableHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(`${this.aggregationType} (${this.StackedColumn_y_Axis.join(' + ')})`)
//       .append('title')
//       .text(`Y Axis: ${this.aggregationType} of ${this.StackedColumn_y_Axis.join(', ')}`);

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

//     window.addEventListener('resize', () => this.renderChart(data));
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
//       StackedColumn_x_Axis: this.data2 ?? [],
//       StackedColumn_y_Axis: this.data3 ?? [],
//       StackedColumn_legend: this.data4 ?? [],
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   getSummaryStats(data: any[]): void {
//     if (!data?.length) return;
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));
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

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) return;
//     this.emitEditEvent();
//   }

//   onDeleteFromChild(): void {
//     this.label = 'StackedColumn';
//     this.aggregationFields = {};
//     this.StackedColumn_x_Axis = [];
//     this.StackedColumn_y_Axis = [];
//     this.StackedColumn_legend = [];
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

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//     window.removeEventListener('resize', () => this.renderChart(this.aggregatedData));
//   }
// }





// import {
//   Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit,
//   ViewChild, ElementRef,
//   booleanAttribute
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
//   StackedColumn_x_Axis: string[];
//   StackedColumn_y_Axis: string[];
//   StackedColumn_legend: string[];
//   uniqueIddata: any,
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }
// export interface deleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-stackedcolumn',
//   standalone: true,
//   templateUrl: './stackedcolumn.component.html',
//   styleUrls: ['./stackedcolumn.component.scss'],
//   imports: [CommonModule, CdkDrag, CdkDragHandle, FormsModule],
// })
// export class StackedcolumnComponent implements OnInit, OnDestroy, AfterViewInit {
//   @Input() label: string = 'StackedColumn';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() StackedColumn_x_Axis: string[] = [];
//   @Input() StackedColumn_y_Axis: string[] = [];
//   @Input() StackedColumn_legend: string[] = [];
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
//   data2:any;
//   data3:any;
//   data4:any;

//   xAxisFormatters: { [field: string]: (value: any) => string } = {};

//   constructor(private coreService: CoreService) { }

//   ngOnInit(): void {
//     this.itchartdata();
//     console.log('the function of title', this.title, '--------ok-------------');
//   }

//   itchartdata() {
//     this.dataSubscription = this.coreService.getChartData(this.label).subscribe(data => {
//       this.data2=data.StackedColumn_x_Axis
//       this.data3=data.StackedColumn_y_Axis
//       this.data4=data.StackedColumn_legend
//        if (this.uniqueId === data.uniqueIddata) {
//       this.showCharts = false;
//       this.chartData = data.data || [];
//       this.aggregationFields = data.aggregationFields || {};
//       this.aggregationType = data.aggregation || 'Count';
//       this.aggregationFieldKey = Object.keys(this.aggregationFields)[0] || '';

//       this.StackedColumn_x_Axis = (data.StackedColumn_x_Axis || []).map((f: any) => f.split('.')[0]);
//       this.StackedColumn_y_Axis = (data.StackedColumn_y_Axis || []).map((f: any) => f.split('.')[0]);
//       this.StackedColumn_legend = (data.StackedColumn_legend || []).map((f: any) => f.split('.')[0]);

//       this.aggregatedData = this.aggregateData(this.chartData);
//       if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//       this.getSummaryStats(this.aggregatedData);
//        }
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
//     const grouped = d3.groups(data, d => this.getKey(d, this.StackedColumn_x_Axis));
//     const legendKeys = Array.from(new Set(data.map(d => this.getKey(d, this.StackedColumn_legend))));

//     return grouped.map(([groupKey, records]) => {
//       const row: any = { group: groupKey };
//       this.StackedColumn_x_Axis.forEach((f, i) => row[`_x${i}`] = records[0][f]);

//       for (const legend of legendKeys) {
//         const subRecords = records.filter(r => this.getKey(r, this.StackedColumn_legend) === legend);
//         row[legend] = this.aggregateValues(subRecords, this.StackedColumn_y_Axis);
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
//     return this.StackedColumn_x_Axis.map((axis: any, i: number) => {
//       const value = d[`_x${i}`] ?? '';
//       const isLast = i === this.StackedColumn_x_Axis.length - 1;

//       const fieldName = typeof axis === 'string' ? axis : axis?.field ?? '';
//       const funcName = typeof axis === 'object' && axis?.func ? axis.func.toUpperCase() : '';

//       if (isLast && funcName) {
//         return `${value}`;
//       }

//       return `${value}`;
//     });
//   }


//   renderChart(data: any[]): void {
//     const container = this.chartContainer.nativeElement;

//     // Clear previous content
//     d3.select(container).selectAll('*').remove();

//     if (
//       !data || data.length === 0 ||
//       !this.StackedColumn_x_Axis?.length ||
//       !this.StackedColumn_y_Axis?.length
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
//     const labelLines = this.StackedColumn_x_Axis.length;
//     const labelHeight = labelLines * lineHeight;
//     const margin = { top: 100, right: 40, bottom: 40 + labelHeight, left: 60 };
//     const availableHeight = Math.max(300, outerHeight);

//     const xDomain = data.map(d => d.group);

//     // Estimate label width
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

//     // Scales
//     const x = d3.scaleBand()
//       .domain(xDomain)
//       .range([margin.left, chartWidth - margin.right])
//       .padding(0.2);

//     const keys = Object.keys(data[0])
//       .filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));

//     const stackedData = d3.stack<any>().keys(keys)(data);
//     const yMax = d3.max(stackedData, series => d3.max(series, d => d[1])) ?? 0;

//     const y = d3.scaleLinear()
//       .domain([0, yMax])
//       .nice()
//       .range([availableHeight - margin.bottom, margin.top]);

//     const color = d3.scaleOrdinal<string>()
//       .domain(keys)
//       .range(d3.schemeSet2);

//     const tooltip = this.createTooltip(container);

//     // Title
//     svg.append('text')
//       .attr('x', chartWidth / 2)
//       .attr('y', 20)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '16px')
//       .style('font-weight', 'bold')
//       .text(this.label || 'StackedColumn Chart')
//       .append('title')
//       .text(`Chart Title: ${this.label || 'StackedColumn Chart'}`);

//     // Bars
//     const group = svg.append('g')
//       .selectAll('g.layer')
//       .data(stackedData)
//       .join('g')
//       .attr('class', 'layer')
//       .attr('fill', d => color(d.key) as string);

//     group.selectAll('rect')
//       .data(d => d.map(p => ({ ...p, key: d.key, data: p.data })))
//       .join('rect')
//       .attr('x', d => x(d.data.group)!)
//       .attr('y', d => y(d[1]))
//       .attr('height', d => y(d[0]) - y(d[1]))
//       .attr('width', x.bandwidth())
//       .on('mouseover', () => tooltip.style('opacity', 1))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, container);
//         const xLabel = this.StackedColumn_x_Axis
//           .map((axis, i) => `${axis}: ${d.data[`_x${i}`] ?? ''}`)
//           .join('<br>');
//         const value = d.data[d.key];
//         tooltip.html(`
//         ${xLabel}<br>
//         <strong>${d.key} (${this.aggregationType}):</strong> ${value?.toFixed?.(2) ?? value}
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
//           StackedColumn_x_Axis:this.data2,
//           StackedColumn_y_Axis:this.data3,
//           StackedColumn_legend:this.data4,
//           uniqueIddata:this.uniqueId,
//           aggregationFields: this.aggregationFields,
//           selectchartfunction: true
//         });
//       });

//     // Optional group separators
//     const splitIndex = this.StackedColumn_x_Axis.length - 1;
//     if (splitIndex >= 0) {
//       const groupBy = d3.groups(data, d => d[`_x${splitIndex}`]);
//       groupBy.forEach(([, items], i) => {
//         if (i === 0) return;
//         const xPos = x(items[0].group);
//         if (xPos !== undefined) {
//           svg.append('line')
//             .attr('x1', xPos - x.bandwidth() / 2)
//             .attr('x2', xPos - x.bandwidth() / 2)
//             .attr('y1', margin.top)
//             .attr('y2', availableHeight - margin.bottom)
//             .attr('stroke', '#ccc')
//             .attr('stroke-dasharray', '4');
//         }
//       });
//     }

//     // Custom X-Axis Labels (with truncation + tooltip)
//     const xAxisGroup = svg.append('g')
//       .attr('transform', `translate(0,${availableHeight - margin.bottom})`);

//     const xTick = xAxisGroup.selectAll('g')
//       .data(data)
//       .enter()
//       .append('g')
//       .attr('transform', d => `translate(${x(d.group)! + x.bandwidth() / 2 - labelWidth / 2}, 0)`);

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

//     xAxisGroup.call(d3.axisBottom(x).tickSize(-6).tickFormat(() => ''));

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
//       .text(this.StackedColumn_x_Axis.join(' / '))
//       .append('title')
//       .text(`X Axis: ${this.StackedColumn_x_Axis.join(', ')}`);

//     svg.append('text')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -availableHeight / 2)
//       .attr('y', 15)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px')
//       .text(`${this.aggregationType} (${this.StackedColumn_y_Axis.join(' + ')})`)
//       .append('title')
//       .text(`Y Axis: ${this.aggregationType} of ${this.StackedColumn_y_Axis.join(', ')}`);

//     // Legend with pagination
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
//     const keys = Object.keys(data[0]).filter(k => !['group', ...this.StackedColumn_x_Axis.map((_, i) => `_x${i}`)].includes(k));
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
//       StackedColumn_x_Axis: this.data2,
//       StackedColumn_y_Axis: this.data3,
//       StackedColumn_legend: this.data4,
//       uniqueIddata:this.uniqueId,
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
//       StackedColumn_x_Axis: this.data2,
//       StackedColumn_y_Axis: this.data3,
//       StackedColumn_legend: this.data4,
//       uniqueIddata:this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'StackedColumn';
//     this.aggregationFields = {};
//     this.StackedColumn_x_Axis = [];
//     this.StackedColumn_y_Axis = [];
//     this.StackedColumn_legend = [];
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false
//     })
//     this.deleteChart.emit(this.uniqueId);
//     if (this.hasViewInitialized) this.renderChart(this.aggregatedData);
//     this.getSummaryStats(this.aggregatedData);
//   }
//   //   OnuniqueIdremove(){
//   // }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }
// }
