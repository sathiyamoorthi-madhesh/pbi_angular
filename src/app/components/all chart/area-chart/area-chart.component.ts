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

export interface ChartEditEvent {
  label: string;
  aggregationFieldKey: string;
  aggregationType: string;
  Area_x_Axis: string;
  Area_y_Axis: string;
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-area-chart',
  standalone: true,
  templateUrl: './area-chart.component.html',
  styleUrls: ['./area-chart.component.scss'],
  imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
})
export class AreaChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() label: string = 'Area';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() Area_x_Axis: string = '';
  @Input() Area_y_Axis: string = '';
  @Input() showCharts: boolean = false;
  @Input() title: string = '';
  @Input() uniqueId: any = '';
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
    // console.log('Title:', this.title);
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
        // console.log('Received data:', data);
        // console.log('Received uniqueIddata:', data.uniqueIddata);
        // console.log('Received field:', data.fields[0]);
        // console.log('Activedata data:', data.activedata);

        if (this.uniqueId !== data.uniqueIddata) {
          return; // Only process if uniqueId matches
        }

        this.showCharts = false;
        this.data2 = data.Area_x_Axis || this.Area_x_Axis;
        this.data3 = data.Area_y_Axis || this.Area_y_Axis;
        // console.log('Area_x_Axis:', this.data2);
        // console.log('Area_y_Axis:', this.data3);

        if (data?.data?.length) {
          this.chartData = data.data;
          this.highlightSet.clear();
          if (data.activedata?.length && this.Area_x_Axis) {
            data.activedata.forEach((row: any) => {
              this.highlightSet.add(row[this.Area_x_Axis]);
            });
          }

          this.aggregationFields = data.aggregationFields || {};
          this.aggregationType = data.fields[0] || 'Count';

          const aggKeys = Object.keys(this.aggregationFields);
          this.aggregationFieldKey = aggKeys[0] || '';
          const [xField, yField] = this.aggregationFieldKey.split('.');

          this.Area_x_Axis = data.Area_x_Axis?.[0]?.split('.')[0] || xField || '';
          this.Area_y_Axis = data.Area_y_Axis?.[0]?.split('.')[0] || yField || '';

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
      Area_x_Axis: this.data2,
      Area_y_Axis: this.data3,
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
    const Ondata = null;
    this.chartDataService.Onpostrelationdata(Ondata);
  }

  OnuniqueIdremove(): void {
    this.deleteChart.emit(this.uniqueId);
  }

  onDeleteFromChild(): void {
    this.label = 'Area';
    this.aggregationFields = {};
    this.Area_x_Axis = '';
    this.Area_y_Axis = '';
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
    if (!data?.length || !this.Area_x_Axis || !this.Area_y_Axis) {
      return [];
    }

    const xKey = this.Area_x_Axis;
    const yKey = this.Area_y_Axis;
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
    }).sort((a, b) => d3.ascending(a[xKey], b[xKey])); // Sort by x-axis for area chart continuity
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
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const hasX = !!this.Area_x_Axis;
    const hasY = !!this.Area_y_Axis;
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
      const x = d3.scalePoint().domain(data.map((d) => d[this.Area_x_Axis])).range([0, width]).padding(0.5);
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
        .text(`Only "${this.Area_x_Axis}" selected. No values to chart.`);
      return;
    }

    const x = d3
      .scalePoint()
      .domain(data.map((d) => d[this.Area_x_Axis]))
      .range([0, width])
      .padding(0.5);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d[this.aggregationType]) || 0])
      .nice()
      .range([height, 0]);

    // X Axis
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

    // X Axis Label
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 30)
      .text(this.Area_x_Axis)
      .style('font-size', '14px');

    // Y Axis
    svg.append('g').call(d3.axisLeft(y));

    // Y Axis Label
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 20)
      .text(`${this.aggregationType} (${this.Area_y_Axis})`)
      .style('font-size', '14px');

    // Split data into highlighted and non-highlighted for separate area paths
    const highlightedData = data.filter(d => d.isHighlighted);
    const nonHighlightedData = data.filter(d => !d.isHighlighted);

    // Non-highlighted area path
    if (nonHighlightedData.length) {
      const area = d3
        .area<any>()
        .x((d) => x(d[this.Area_x_Axis])!)
        .y0(y(0))
        .y1((d) => y(+d[this.aggregationType]));

      svg
        .append('path')
        .datum(nonHighlightedData)
        .attr('fill', '#ccc') // Non-highlighted area in gray
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2)
        .attr('d', area);
    }

    // Highlighted area path
    if (highlightedData.length) {
      const area = d3
        .area<any>()
        .x((d) => x(d[this.Area_x_Axis])!)
        .y0(y(0))
        .y1((d) => y(+d[this.aggregationType]));

      svg
        .append('path')
        .datum(highlightedData)
        .attr('fill', 'lightsteelblue') // Highlighted area in lightsteelblue
        .attr('stroke', color('0'))
        .attr('stroke-width', 2)
        .attr('d', area);
    }

    // Data Points
    svg
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d[this.Area_x_Axis])!)
      .attr('cy', (d) => y(+d[this.aggregationType]))
      .attr('r', 5)
      .attr('fill', (d) => d.isHighlighted ? '#007bff' : '#ccc') // Highlighted points in blue, others in gray
      .on('mousemove', (event, d) => {
        const [mx, my] = d3.pointer(event, element);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${this.Area_x_Axis}:</strong> ${d[this.Area_x_Axis]}<br><strong>${this.aggregationType}:</strong> ${d[this.aggregationType]}`)
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
      .attr('class', 'label')
      .text((d) => d[this.aggregationType])
      .attr('x', (d) => x(d[this.Area_x_Axis])!)
      .attr('y', (d) => y(+d[this.aggregationType]) - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px');
  }

  showSwalTable(d: any): void {
    // Filter rows where x-axis matches
    const filtered = this.chartData.filter(
      (row) => row[this.Area_x_Axis] === d[this.Area_x_Axis]
    );

    // Get unique x-axis values
    const uniqueValues = [...new Set(filtered.map((row) => row[this.Area_x_Axis]))];

    // Format as { xAxisFieldName: [data1, data2, ...] }
    const formattedData = {
      [this.Area_x_Axis]: uniqueValues
    };

    // console.log('----------formatted area chart data----------------', formattedData);

    // Send formatted data to service
    this.chartDataService.Onpostrelationdata(formattedData);

    // Keep full data for active usage
    this.activedata = [...filtered];
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
