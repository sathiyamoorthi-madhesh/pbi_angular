import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { CoreService } from '../../../services/core.service';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MaterialImportsModule } from '../../../material.imports';

// Interface for chart edit event
export interface ChartEditEvent {
  label: string;
  aggregationFieldKey: string;
  aggregationType: string;
  Line_x_Axis: string;
  Line_y_Axis: string;
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

// Interface for delete chart event
export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialImportsModule]
})
export class LineChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() label: string = 'Line';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() Line_x_Axis: string = '';
  @Input() Line_y_Axis: string = '';
  @Input() uniqueId: any = '';
  @Input() title: string = '';
  @Input() Titles: string = '';
  @Input() showCharts: boolean = false;
  @Input() Ondata: string = '';
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<any>();

  private dataSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private hasViewInitialized: boolean = false;
  private chartData: any[] = [];
  private aggregatedData: any[] = [];
  private aggregationType: string = 'Count';
  private aggregationFieldKey: string = '';
  private data2: string = '';
  private data3: string = '';
  private highlightSet: Set<any> = new Set(); // For highlighting based on activedata
  private activedata: any[] = [];

  constructor(private chartDataService: CoreService) { }

  ngOnInit(): void {
    this.fetchChartData();
    console.log('Title:', this.title);
    console.log('Ondata:', this.Ondata);
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    if (this.chartContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.aggregatedData?.length) {
          this.renderChart(this.aggregatedData);
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
    if (this.aggregatedData?.length) {
      this.renderChart(this.aggregatedData);
    }
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  fetchChartData(): void {
    this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
      next: (data) => {
        console.log('Received data:', data);
        console.log('Received uniqueIddata:', data.uniqueIddata);
        console.log('Received field:', data.fields[0]);
        console.log('Activedata data:', data.activedata);

        if (this.uniqueId !== data.uniqueIddata) {
          return; // Only process if uniqueId matches
        }

        this.showCharts = false;
        this.data2 = data.Line_x_Axis || this.Line_x_Axis;
        this.data3 = data.Line_y_Axis || this.Line_y_Axis;
        console.log('Line_x_Axis:', this.data2);
        console.log('Line_y_Axis:', this.data3);

        if (data?.data?.length) {
          this.chartData = data.data;
          this.highlightSet.clear();
          if (data.activedata?.length && this.Line_x_Axis) {
            data.activedata.forEach((row: any) => {
              this.highlightSet.add(row[this.Line_x_Axis]);
            });
          }

          this.aggregationFields = data.aggregationFields || {};
          this.aggregationType = data.fields[0] || 'Count';

          const aggKeys = Object.keys(this.aggregationFields);
          this.aggregationFieldKey = aggKeys[0] || '';
          const [xField, yField] = this.aggregationFieldKey.split('.');

          this.Line_x_Axis = data.Line_x_Axis?.[0]?.split('.')[0] || xField || '';
          this.Line_y_Axis = data.Line_y_Axis?.[0]?.split('.')[0] || yField || '';

          this.aggregatedData = this.aggregateData(this.chartData);

          if (this.hasViewInitialized) {
            this.renderChart(this.aggregatedData);
          }

          this.getSummaryStats(this.aggregatedData);
        }
      },
      error: (err) => {
        console.error('Error fetching chart data:', err);
      }
    });
  }

  handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) {
      return;
    }
    this.editClicked.emit({
      label: this.label,
      aggregationFieldKey: this.aggregationFieldKey,
      aggregationType: this.aggregationType,
      Line_x_Axis: this.data2,
      Line_y_Axis: this.data3,
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  hidethepage(): void {
    this.onDeleteFromChild();
    this.editClickeds.emit({
      label: this.label,
      selectchartfunction: false
    });
    this.OnuniqueIdremove();
  }

  OnuniqueIdremove(): void {
    this.deleteChart.emit(this.uniqueId);
  }

  onDeleteFromChild(): void {
    this.label = 'Line';
    this.aggregationFields = {};
    this.Line_x_Axis = '';
    this.Line_y_Axis = '';
    this.aggregationType = '';
    this.chartData = [];
    this.aggregatedData = [];
    this.highlightSet.clear();
    this.showCharts = true;

    if (this.hasViewInitialized) {
      this.renderChart([]);
    }
    this.getSummaryStats([]);
  }

  aggregateData(data: any[]): any[] {
    if (!data?.length || !this.Line_x_Axis || !this.Line_y_Axis) {
      return [];
    }

    const xKey = this.Line_x_Axis;
    const yKey = this.Line_y_Axis;
    const agg = this.aggregationType;
    const grouped = d3.group(data, (d) => d[xKey]);

    return Array.from(grouped, ([groupKey, values]) => {
      const yValues = values
        .map((v) => +v[yKey])
        .filter((v) => !isNaN(v));
      let result: number | string = 0;
      switch (agg) {
        case 'Count':
          result = values.length;
          break;
        case 'Count Distinct':
          result = new Set(values.map((v) => v[yKey])).size;
          break;
        case 'Sum':
          result = d3.sum(yValues).toFixed(2);
          break;
        case 'Average':
          result = yValues.length ? (d3.sum(yValues) / yValues.length).toFixed(2) : '0';
          break;
        case 'Min':
          result = d3.min(yValues) ?? 0;
          break;
        case 'Max':
          result = d3.max(yValues) ?? 0;
          break;
        default:
          result = d3.sum(yValues);
      }
      const isHighlighted = this.highlightSet.has(groupKey);
      return { [xKey]: groupKey, [agg]: result, isHighlighted };
    }).sort((a, b) => d3.ascending(a[xKey], b[xKey])); // Sort for line chart continuity
  }

  isHorizontalChart(): boolean {
    const sample = this.chartData?.[0];
    return sample && !isNaN(+sample[this.aggregationType]) && isNaN(+sample[this.Line_x_Axis]);
  }

  renderChart(data: any[]): void {
    if (!this.chartContainer?.nativeElement) {
      return;
    }

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 100, left: 100 };
    const containerRect = element.getBoundingClientRect();
    const widthPerPoint = 80;
    const totalWidth = data.length * widthPerPoint;
    const containerWidth = containerRect.width;
    const width = Math.max(totalWidth, containerWidth) - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;

    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('overflow-x', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = this.createTooltip(element);

    const hasX = !!this.Line_x_Axis;
    const hasY = !!this.Line_y_Axis;
    const hasAgg = !!this.aggregationType;

    if (!hasX) {
      svg
        .append('text')
        .text('No X-Axis selected.')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px');
      return;
    }

    if (!hasY || !hasAgg) {
      const x = d3.scalePoint().domain(data.map((d) => d[this.Line_x_Axis])).range([0, width]).padding(0.5);
      svg
        .append('g')
        .attr('transform', `translate(0, ${height / 2})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('text-anchor', 'middle')
        .style('font-size', '14px');
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`Only "${this.Line_x_Axis}" selected. No values to chart.`);
      return;
    }

    const isHorizontal = this.isHorizontalChart();
    const axisField = this.aggregationType;

    data.sort((a, b) => d3.ascending(a[this.Line_x_Axis], b[this.Line_x_Axis]));

    if (isHorizontal) {
      const y = d3.scaleBand().domain(data.map((d) => d[this.Line_x_Axis])).range([0, height]).padding(0.2);
      const x = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([0, width]);

      svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');
      svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));

      // Line Path for Horizontal
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', (d) => d[0].isHighlighted ? '#007bff' : '#ccc')
        .attr('stroke-width', 2)
        .attr('d', d3.line<any>()
          .x((d) => x(+d[axisField]))
          .y((d) => y(d[this.Line_x_Axis])! + y.bandwidth() / 2)
        );

      // Data Points
      svg
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => x(+d[axisField]))
        .attr('cy', (d) => y(d[this.Line_x_Axis])! + y.bandwidth() / 2)
        .attr('r', 5)
        .attr('fill', (d) => d.isHighlighted ? '#007bff' : '#ccc')
        .on('mousemove', (event, d) => {
          const [mx, my] = d3.pointer(event, element);
          tooltip
            .style('opacity', 1)
            .html(`<strong>${this.Line_x_Axis}:</strong> ${d[this.Line_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
            .style('left', `${mx + 20}px`)
            .style('top', `${my}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))
        .on('click', (_, d) => this.showSwalTable(d));

      // Data Labels
      svg
        .selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .text((d) => d[axisField])
        .attr('x', (d) => x(+d[axisField]) + 5)
        .attr('y', (d) => y(d[this.Line_x_Axis])! + y.bandwidth() / 2 + 4)
        .style('font-size', '12px');
    } else {
      const x = d3.scalePoint().domain(data.map((d) => d[this.Line_x_Axis])).range([0, width]).padding(0.5);
      const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([height, 0]);

      svg
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-45)')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .style('font-size', '12px');

      svg
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 30)
        .text(this.Line_x_Axis)
        .style('font-size', '14px');

      svg.append('g').call(d3.axisLeft(y));

      svg
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .text(`${this.aggregationType} (${this.Line_y_Axis})`)
        .style('font-size', '14px');

      // Line Path for Vertical
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', (d) => d[0].isHighlighted ? 'red' : '#ccc')
        .attr('stroke-width', 2)
        .attr('d', d3.line<any>()
          .x((d) => x(d[this.Line_x_Axis])!)
          .y((d) => y(+d[axisField]))
        );

      // Data Points
      svg
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => x(d[this.Line_x_Axis])!)
        .attr('cy', (d) => y(+d[axisField]))
        .attr('r', 5)
        .attr('fill', (d) => d.isHighlighted ? 'red' : '#ccc')
        .on('mousemove', (event, d) => {
          const [mx, my] = d3.pointer(event, element);
          tooltip
            .style('opacity', 1)
            .html(`<strong>${this.Line_x_Axis}:</strong> ${d[this.Line_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
            .style('left', `${mx + 20}px`)
            .style('top', `${my}px`);
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))
        .on('click', (_, d) => this.showSwalTable(d));

      // Data Labels
      svg
        .selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .text((d) => d[axisField])
        .attr('x', (d) => x(d[this.Line_x_Axis])!)
        .attr('y', (d) => y(+d[axisField]) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px');
    }
  }

  showSwalTable(d: any): void {
    // Filter rows where x-axis matches
    const matchingRows = this.chartData.filter(
      (row) => row[this.Line_x_Axis] === d[this.Line_x_Axis]
    );

    // Get unique x-axis values (no duplicates)
    const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Line_x_Axis]))];

    // Format as { xAxisFieldName: [data1, data2, ...] }
    const formattedData = {
      [this.Line_x_Axis]: uniqueValues
    };

    console.log('----------formatted line chart data----------------', formattedData);

    // Send formatted data to service
    this.chartDataService.Onpostrelationdata(formattedData);

    // Keep full data for active usage
    this.activedata = [...matchingRows];
    this.ngOnInit();
  }

  createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
    return d3
      .select(container)
      .append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('font-size', '13px')
      .style('padding', '6px 12px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', '0');
  }

  getSummaryStats(data: any[]): void {
    const values = data.map((d) => +d[this.aggregationType]).filter((v) => !isNaN(v));
    const summary = {
      total: d3.sum(values),
      min: d3.min(values),
      max: d3.max(values),
      avg: values.length ? (d3.mean(values) || 0).toFixed(2) : '0'
    };
    console.log(`${this.label} Chart Summary:`, summary);
  }
}


















// import {
//   Component,
//   Input,
//   OnInit,
//   OnDestroy,
//   ViewChild,
//   ElementRef,
//   AfterViewInit,
//   Output,
//   EventEmitter
// } from '@angular/core';
// import * as d3 from 'd3';
// import { Subscription } from 'rxjs';
// import { CoreService } from 'src/app/services/core.service';
// import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import Swal from 'sweetalert2';

// export interface ChartEditEvent {
//   label: string;
//   aggregationFieldKey: string;
//   aggregationType: string;
//   Line_x_Axis: string;
//   Line_y_Axis: string;
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }
// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-line-chart',
//   standalone: true,
//   templateUrl: './line-chart.component.html',
//   styleUrls: ['./line-chart.component.scss'],
//   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
// })
// export class LineChartComponent implements OnInit, AfterViewInit, OnDestroy {
//   @Input() label: string = 'Line';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() Line_x_Axis: string = '';
//   @Input() Line_y_Axis: string = '';
//   @Input() showCharts: boolean = false;
//   @Input() uniqueId: any = '';
//   @Input() title: string = '';
//   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<any>();

//   private dataSubscription?: Subscription;
//   private resizeObserver?: ResizeObserver;
//   private hasViewInitialized = false;
//   private chartData: any[] = [];
//   private aggregatedData: any[] = [];
//   private aggregationType: string = 'Count';
//   private aggregationFieldKey: string = '';
//   private data2: string = '';
//   private data3: string = '';

//   constructor(private chartDataService: CoreService) { }
//   activedata: any[] = [];
//   ngOnInit(): void {
//     this.fetchChartData();
//     console.log('Title:', this.title);
//     // this.chartDataService.OnrelationData$.subscribe(data => {
//     //   console.log('Auto-updated data:', data);
//     // });
//   }

//   ngAfterViewInit(): void {
//     this.hasViewInitialized = true;
//     if (this.chartContainer?.nativeElement) {
//       this.resizeObserver = new ResizeObserver(() => {
//         if (this.aggregatedData?.length) {
//           this.renderChart(this.aggregatedData);
//         }
//       });
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.aggregatedData?.length) {
//       this.renderChart(this.aggregatedData);
//     }
//   }

//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }

//   fetchChartData(): void {
//     this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
//       next: (data) => {
//         console.log('Received data:', data);
//         console.log('Received uniqueIddata:', data.uniqueIddata);

//         if (this.uniqueId !== data.uniqueIddata) {
//           return; // Only process if uniqueId matches
//         }

//         this.showCharts = false;
//         this.data2 = data.Line_x_Axis || this.Line_x_Axis;
//         this.data3 = data.Line_y_Axis || this.Line_y_Axis;
//         console.log('Line_x_Axis:', this.data2);
//         console.log('Line_y_Axis:', this.data3);

//         if (data?.data?.length) {
//           this.chartData = data.data;
//           this.aggregationFields = data.aggregationFields || {};
//           this.aggregationType = data.fields[0] || 'Count';

//           const aggKeys = Object.keys(this.aggregationFields);
//           this.aggregationFieldKey = aggKeys[0] || '';
//           const [xField, yField] = this.aggregationFieldKey.split('.');

//           this.Line_x_Axis = data.Line_x_Axis?.[0]?.split('.')[0] || xField || '';
//           this.Line_y_Axis = data.Line_y_Axis?.[0]?.split('.')[0] || yField || '';

//           this.aggregatedData = this.aggregateData(this.chartData);

//           if (this.hasViewInitialized) {
//             this.renderChart(this.aggregatedData);
//           }

//           this.getSummaryStats(this.aggregatedData);
//         }
//       },
//       error: (err) => {
//         console.error('Error fetching chart data:', err);
//       }
//     });
//   }

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) {
//       return;
//     }
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       Line_x_Axis: this.data2,
//       Line_y_Axis: this.data3,
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   hidethepage(): void {
//     this.onDeleteFromChild();
//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false
//     });
//     this.OnuniqueIdremove();
//   }

//   OnuniqueIdremove(): void {
//     this.deleteChart.emit(this.uniqueId);
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Line';
//     this.aggregationFields = {};
//     this.Line_x_Axis = '';
//     this.Line_y_Axis = '';
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;

//     if (this.hasViewInitialized) {
//       this.renderChart([]);
//     }
//     this.getSummaryStats([]);
//   }

//   aggregateData(data: any[]): any[] {
//     if (!data?.length || !this.Line_x_Axis || !this.Line_y_Axis) {
//       return [];
//     }

//     const xKey = this.Line_x_Axis;
//     const yKey = this.Line_y_Axis;
//     const agg = this.aggregationType;
//     const grouped = d3.group(data, (d) => d[xKey]);

//     return Array.from(grouped, ([groupKey, values]) => {
//       const yValues = values
//         .map((v) => +v[yKey])
//         .filter((v) => !isNaN(v));
//       let result: number | string = 0;
//       switch (agg) {
//         case 'Count':
//           result = values.length;
//           break;
//         case 'Count Distinct':
//           result = new Set(values.map((v) => v[yKey])).size;
//           break;
//         case 'Sum':
//           result = d3.sum(yValues).toFixed(2);
//           break;
//         case 'Average':
//           result = yValues.length ? (d3.sum(yValues) / yValues.length).toFixed(2) : '0';
//           break;
//         case 'Min':
//           result = d3.min(yValues) ?? 0;
//           break;
//         case 'Max':
//           result = d3.max(yValues) ?? 0;
//           break;
//         default:
//           result = d3.sum(yValues);
//       }
//       return { [xKey]: groupKey, [agg]: result };
//     }).sort((a, b) => d3.ascending(a[xKey], b[xKey])); // Sort by x-axis for line chart continuity
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer?.nativeElement) {
//       return;
//     }

//     const element = this.chartContainer.nativeElement;
//     d3.select(element).selectAll('*').remove();

//     const margin = { top: 20, right: 20, bottom: 100, left: 100 };
//     const containerRect = element.getBoundingClientRect();
//     const widthPerPoint = 80;
//     const totalWidth = data.length * widthPerPoint;
//     const containerWidth = containerRect.width;
//     const width = Math.max(totalWidth, containerWidth) - margin.left - margin.right;
//     const height = containerRect.height - margin.top - margin.bottom;

//     const svg = d3
//       .select(element)
//       .append('svg')
//       .attr('width', width + margin.left + margin.right)
//       .attr('height', height + margin.top + margin.bottom)
//       .style('overflow-x', 'auto')
//       .append('g')
//       .attr('transform', `translate(${margin.left},${margin.top})`);

//     const tooltip = this.createTooltip(element);
//     const color = d3.scaleOrdinal(d3.schemeCategory10);

//     const hasX = !!this.Line_x_Axis;
//     const hasY = !!this.Line_y_Axis;
//     const hasAgg = !!this.aggregationType;

//     if (!hasX) {
//       svg
//         .append('text')
//         .text('No X-Axis selected.')
//         .attr('x', width / 2)
//         .attr('y', height / 2)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '16px');
//       return;
//     }

//     if (!hasY || !hasAgg) {
//       const x = d3.scalePoint().domain(data.map((d) => d[this.Line_x_Axis])).range([0, width]).padding(0.5);
//       svg
//         .append('g')
//         .attr('transform', `translate(0, ${height / 2})`)
//         .call(d3.axisBottom(x))
//         .selectAll('text')
//         .attr('text-anchor', 'middle')
//         .style('font-size', '14px');
//       svg
//         .append('text')
//         .attr('x', width / 2)
//         .attr('y', height / 2 + 40)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '16px')
//         .text(`Only "${this.Line_x_Axis}" selected. No values to chart.`);
//       return;
//     }

//     const x = d3
//       .scalePoint()
//       .domain(data.map((d) => d[this.Line_x_Axis]))
//       .range([0, width])
//       .padding(0.5);

//     const y = d3
//       .scaleLinear()
//       .domain([0, d3.max(data, (d) => +d[this.aggregationType]) || 0])
//       .nice()
//       .range([height, 0]);

//     // X Axis
//     svg
//       .append('g')
//       .attr('transform', `translate(0,${height})`)
//       .call(d3.axisBottom(x))
//       .selectAll('text')
//       .attr('text-anchor', 'end')
//       .attr('transform', 'rotate(-45)')
//       .attr('dx', '-0.8em')
//       .attr('dy', '0.15em')
//       .style('font-size', '12px');

//     // X Axis Label
//     svg
//       .append('text')
//       .attr('text-anchor', 'middle')
//       .attr('x', width / 2)
//       .attr('y', height + margin.bottom - 30)
//       .text(this.Line_x_Axis)
//       .style('font-size', '14px');

//     // Y Axis
//     svg.append('g').call(d3.axisLeft(y));

//     // Y Axis Label
//     svg
//       .append('text')
//       .attr('text-anchor', 'middle')
//       .attr('transform', 'rotate(-90)')
//       .attr('x', -height / 2)
//       .attr('y', -margin.left + 20)
//       .text(`${this.aggregationType} (${this.Line_y_Axis})`)
//       .style('font-size', '14px');

//     // Line Path
//     svg
//       .append('path')
//       .datum(data)
//       .attr('fill', 'none')
//       .attr('stroke', color('0'))
//       .attr('stroke-width', 2)
//       .attr('d', d3.line<any>()
//         .x((d) => x(d[this.Line_x_Axis])!)
//         .y((d) => y(+d[this.aggregationType]))
//       );

//     // Data Points
//     svg
//       .selectAll('circle')
//       .data(data)
//       .enter()
//       .append('circle')
//       .attr('cx', (d) => x(d[this.Line_x_Axis])!)
//       .attr('cy', (d) => y(+d[this.aggregationType]))
//       .attr('r', 5)
//       .attr('fill', color('0'))
//       .on('mousemove', (event, d) => {
//         const [mx, my] = d3.pointer(event, element);
//         tooltip
//           .style('opacity', 1)
//           .html(`<strong>${this.Line_x_Axis}:</strong> ${d[this.Line_x_Axis]}<br><strong>${this.aggregationType}:</strong> ${d[this.aggregationType]}`)
//           .style('left', `${mx + 20}px`)
//           .style('top', `${my}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', (_, d) => this.showSwalTable(d));

//     // Data Labels
//     svg
//       .selectAll('.label')
//       .data(data)
//       .enter()
//       .append('text')
//       .attr('class', 'label')
//       .text((d) => d[this.aggregationType])
//       .attr('x', (d) => x(d[this.Line_x_Axis])!)
//       .attr('y', (d) => y(+d[this.aggregationType]) - 8)
//       .attr('text-anchor', 'middle')
//       .style('font-size', '12px');
//   }

//   // showSwalTable(d: any): void {
//   //   const matchingRows = this.chartData.filter((row) => row[this.Line_x_Axis] === d[this.Line_x_Axis]);
//   //   console.log('----------bar----------------', matchingRows);
//   //   this.chartDataService.Onpostrelationdata(matchingRows);

//   //   this.activedata = [...matchingRows];
//   //   this.ngOnInit();
//   // }


//   showSwalTable(d: any): void {
//     // Filter rows where x-axis matches
//     const matchingRows = this.chartData.filter(
//       (row) => row[this.Line_x_Axis] === d[this.Line_x_Axis]
//     );

//     // Get unique x-axis values (no duplicates)
//     const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Line_x_Axis]))];

//     // Format as { xAxisFieldName: [data1, data2, ...] }
//     const formattedData = {
//       [this.Line_x_Axis]: uniqueValues
//     };

//     console.log('----------formatted line chart data----------------', formattedData);

//     // Send formatted data to service
//     this.chartDataService.Onpostrelationdata(formattedData);

//     // Keep full data for active usage
//     this.activedata = [...matchingRows];

//     // Re-initialize component if needed
//     this.ngOnInit();
//   }


//   createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
//     return d3
//       .select(container)
//       .append('div')
//       .attr('class', 'd3-tooltip')
//       .style('position', 'absolute')
//       .style('background', '#fff')
//       .style('font-size', '13px')
//       .style('padding', '6px 12px')
//       .style('border', '1px solid #ccc')
//       .style('border-radius', '4px')
//       .style('pointer-events', 'none')
//       .style('opacity', '0');
//   }

//   getSummaryStats(data: any[]): void {
//     const values = data.map((d) => +d[this.aggregationType]).filter((v) => !isNaN(v));
//     const summary = {
//       total: d3.sum(values),
//       min: d3.min(values),
//       max: d3.max(values),
//       avg: values.length ? (d3.mean(values) || 0).toFixed(2) : '0'
//     };
//     console.log(`${this.label} Chart Summary:`, summary);
//   }
// }

