import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy
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
  Donut_legend: string;
  Donut_value: string;
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-donut',
  standalone: true,
  templateUrl: './donut.component.html',
  styleUrls: ['./donut.component.scss'],
  imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
})
export class DonutComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() label: string = 'Donut';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() Donut_legend: string = '';
  @Input() Donut_value: string = '';
  @Input() showCharts: boolean = false;
  @Input() uniqueId: any = '';
  @Input() title: string = '';
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<any>();

  private dataSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private hasViewInitialized = false;
  private chartData: any[] = [];
  private aggregatedData: any[] = [];
  private aggregationType: string = 'Count';
  private aggregationFieldKey: string = '';
  private data2: string = '';
  private data3: string = '';
  private highlightSet: Set<any> = new Set(); // For highlighting based on activedata

  constructor(private chartDataService: CoreService) { }
  activedata: any[] = [];

  ngOnInit(): void {
    this.fetchChartData();
    console.log('Title:', this.title);
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    if (this.chartContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.Donut_legend && this.Donut_value && this.aggregatedData?.length) {
          this.renderChart(this.aggregatedData);
        } else {
          this.renderChart([]);
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
    if (this.Donut_legend && this.Donut_value && this.aggregatedData?.length) {
      this.renderChart(this.aggregatedData);
    } else {
      this.renderChart([]);
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
        console.log('Activedata data:', data.activedata);

        if (this.uniqueId !== data.uniqueIddata) {
          return; // Only process if uniqueId matches
        }

        this.showCharts = false;
        this.data2 = data.Donut_legend || this.Donut_legend;
        this.data3 = data.Donut_value || this.Donut_value;
        console.log('Donut_legend:', this.data2);
        console.log('Donut_value:', this.data3);

        if (data?.data?.length) {
          this.chartData = data.data;
          this.highlightSet.clear();
          if (data.activedata?.length && this.Donut_legend) {
            data.activedata.forEach((row: any) => {
              this.highlightSet.add(row[this.Donut_legend]);
            });
          }

          this.aggregationFields = data.aggregationFields || {};
          this.aggregationType = data.fields[0] || 'Count';

          const aggKeys = Object.keys(this.aggregationFields);
          this.aggregationFieldKey = aggKeys[0] || '';
          const [legend, value] = this.aggregationFieldKey.split('.') ?? [];

          this.Donut_legend = data.Donut_legend?.[0]?.split('.')[0] || legend || '';
          this.Donut_value = data.Donut_value?.[0]?.split('.')[0] || value || '';

          if (this.Donut_legend && this.Donut_value) {
            this.aggregatedData = this.aggregateData(this.chartData);
            if (this.hasViewInitialized) {
              this.renderChart(this.aggregatedData);
            }
            this.getSummaryStats(this.aggregatedData);
          } else {
            this.aggregatedData = [];
            if (this.hasViewInitialized) {
              this.renderChart([]);
            }
          }
        }
      },
      error: (err) => {
        console.error('Error fetching chart data:', err);
      }
    });
  }

  aggregateData(data: any[]): any[] {
    if (!data?.length || !this.Donut_legend || !this.Donut_value) {
      return [];
    }

    const grouped = d3.group(data, (d) => d[this.Donut_legend]);

    return Array.from(grouped, ([key, values]) => {
      const valuesList = values
        .map((v) => +v[this.Donut_value])
        .filter((v) => !isNaN(v));
      let result: number | string = 0;

      switch (this.aggregationType) {
        case 'Count':
          result = values.length;
          break;
        case 'Count Distinct':
          result = new Set(values.map((v) => v[this.Donut_value])).size;
          break;
        case 'Sum':
          result = d3.sum(valuesList).toFixed(2);
          break;
        case 'Average':
          result = valuesList.length ? (d3.sum(valuesList) / valuesList.length).toFixed(2) : '0';
          break;
        case 'Min':
          result = d3.min(valuesList) ?? 0;
          break;
        case 'Max':
          result = d3.max(valuesList) ?? 0;
          break;
        default:
          result = d3.sum(valuesList);
      }

      const isHighlighted = this.highlightSet.has(key);
      return {
        [this.Donut_legend]: key,
        [this.aggregationType]: result,
        isHighlighted
      };
    });
  }

  renderChart(data: any[]): void {
    if (!this.chartContainer?.nativeElement) {
      return;
    }

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();

    if (!this.Donut_legend || !this.Donut_value || !data?.length) {
      d3.select(element)
        .append('div')
        .text('Please select both Legend and Value fields to display chart.')
        .style('color', '#999')
        .style('font-size', '14px')
        .style('padding', '1rem')
        .style('text-align', 'center');
      return;
    }

    const containerRect = element.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    const radius = Math.min(width, height) / 2.5;
    const hasManyItems = data.length > 8;

    const wrapper = d3
      .select(element)
      .append('div')
      .style('display', 'flex')
      .style('width', '100%')
      .style('height', '100%')
      .style('position', 'relative');

    const chartDiv = wrapper
      .append('div')
      .style('flex', hasManyItems ? '0 0 calc(100% - 160px)' : '1')
      .style('position', 'relative');

    const svg = chartDiv
      .append('svg')
      .attr('width', hasManyItems ? width - 160 : width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${(hasManyItems ? width - 160 : width) / 2}, ${height / 2})`);

    const tooltip = this.createTooltip(element);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie<any>().value((d) => +d[this.aggregationType]).sort(null);
    const arc = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius); // Inner radius for donut effect
    const labelArc = d3.arc<any>().innerRadius(radius * 0.75).outerRadius(radius * 0.75);

    const arcs = svg
      .selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.isHighlighted ? '#ccc' : color(d.index.toString()))
      .on('mousemove', (event, d) => {
        const [mouseX, mouseY] = d3.pointer(event, element);
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${this.Donut_legend}:</strong> ${d.data[this.Donut_legend]}<br>` +
            `<strong>${this.aggregationType}:</strong> ${d.data[this.aggregationType]}`
          )
          .style('left', `${mouseX + 20}px`)
          .style('top', `${mouseY}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (_, d) => this.showSwalTable(d.data));

    if (!hasManyItems) {
      arcs
        .append('text')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text((d) => d.data[this.Donut_legend]);
    } else {
      wrapper
        .append('div')
        .style('width', '1px')
        .style('background-color', '#ccc')
        .style('margin', '0 10px');

      const legend = wrapper
        .append('div')
        .attr('class', 'donut-legend-scroll')
        .style('width', '140px')
        .style('overflow-y', 'auto')
        .style('max-height', `${height - 40}px`)
        .style('padding', '4px 8px');

      data.forEach((d, i) => {
        legend
          .append('div')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('margin-bottom', '6px')
          .html(
            `<div style="width: 12px; height: 12px; background-color: ${d.isHighlighted ? '#007bff' : color(i.toString())}; margin-right: 6px;"></div>` +
            `<span style="font-size: 12px;">${d[this.Donut_legend]}</span>`
          );
      });
    }
  }

  showSwalTable(d: any): void {
    // Filter rows matching the selected legend
    const matchingRows = this.chartData.filter(
      (row) => row[this.Donut_legend] === d[this.Donut_legend]
    );

    // Get unique legend values (no duplicates)
    const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Donut_legend]))];

    // Format as { Donut_legend: [value1, value2, ...] }
    const formattedData = {
      [this.Donut_legend]: uniqueValues
    };

    console.log('----------formatted donut data----------------', formattedData);

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
    console.log(`${this.label} Donut Chart Summary:`, summary);
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
      Donut_legend: this.data2,
      Donut_value: this.data3,
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  onDeleteFromChild(): void {
    this.label = 'Donut';
    this.aggregationFields = {};
    this.Donut_legend = '';
    this.Donut_value = '';
    this.aggregationType = '';
    this.chartData = [];
    this.aggregatedData = [];
    this.highlightSet.clear();
    this.showCharts = true;

    this.editClickeds.emit({
      label: this.label,
      selectchartfunction: false
    });
    this.OnuniqueIdremove();
    if (this.hasViewInitialized) {
      this.renderChart([]);
    }
    this.getSummaryStats([]);
  }

  OnuniqueIdremove(): void {
    this.deleteChart.emit(this.uniqueId);
    const Ondata = null;
    this.chartDataService.Onpostrelationdata(Ondata);
  }
}













// import {
//   Component,
//   Input,
//   OnInit,
//   AfterViewInit,
//   ViewChild,
//   ElementRef,
//   Output,
//   EventEmitter,
//   OnDestroy
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
//   Donut_legend: string;
//   Donut_value: string;
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-donut',
//   standalone: true,
//   templateUrl: './donut.component.html',
//   styleUrls: ['./donut.component.scss'],
//   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
// })
// export class DonutComponent implements OnInit, AfterViewInit, OnDestroy {
//   @Input() label: string = 'Donut';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() Donut_legend: string = '';
//   @Input() Donut_value: string = '';
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
//         if (this.Donut_legend && this.Donut_value && this.aggregatedData?.length) {
//           this.renderChart(this.aggregatedData);
//         } else {
//           this.renderChart([]);
//         }
//       });
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.Donut_legend && this.Donut_value && this.aggregatedData?.length) {
//       this.renderChart(this.aggregatedData);
//     } else {
//       this.renderChart([]);
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
//         this.data2 = data.Donut_legend || this.Donut_legend;
//         this.data3 = data.Donut_value || this.Donut_value;
//         console.log('Donut_legend:', this.data2);
//         console.log('Donut_value:', this.data3);

//         if (data?.data?.length) {
//           this.chartData = data.data;
//           this.aggregationFields = data.aggregationFields || {};
//           this.aggregationType = data.fields[0] || 'Count';

//           const aggKeys = Object.keys(this.aggregationFields);
//           this.aggregationFieldKey = aggKeys[0] || '';
//           const [legend, value] = this.aggregationFieldKey.split('.') ?? [];

//           this.Donut_legend = data.Donut_legend?.[0]?.split('.')[0] || legend || '';
//           this.Donut_value = data.Donut_value?.[0]?.split('.')[0] || value || '';

//           if (this.Donut_legend && this.Donut_value) {
//             this.aggregatedData = this.aggregateData(this.chartData);
//             if (this.hasViewInitialized) {
//               this.renderChart(this.aggregatedData);
//             }
//             this.getSummaryStats(this.aggregatedData);
//           } else {
//             this.aggregatedData = [];
//             if (this.hasViewInitialized) {
//               this.renderChart([]);
//             }
//           }
//         }
//       },
//       error: (err) => {
//         console.error('Error fetching chart data:', err);
//       }
//     });
//   }

//   aggregateData(data: any[]): any[] {
//     if (!data?.length || !this.Donut_legend || !this.Donut_value) {
//       return [];
//     }

//     const grouped = d3.group(data, (d) => d[this.Donut_legend]);

//     return Array.from(grouped, ([key, values]) => {
//       const valuesList = values
//         .map((v) => +v[this.Donut_value])
//         .filter((v) => !isNaN(v));
//       let result: number | string = 0;

//       switch (this.aggregationType) {
//         case 'Count':
//           result = values.length;
//           break;
//         case 'Count Distinct':
//           result = new Set(values.map((v) => v[this.Donut_value])).size;
//           break;
//         case 'Sum':
//           result = d3.sum(valuesList).toFixed(2);
//           break;
//         case 'Average':
//           result = valuesList.length ? (d3.sum(valuesList) / valuesList.length).toFixed(2) : '0';
//           break;
//         case 'Min':
//           result = d3.min(valuesList) ?? 0;
//           break;
//         case 'Max':
//           result = d3.max(valuesList) ?? 0;
//           break;
//         default:
//           result = d3.sum(valuesList);
//       }

//       return {
//         [this.Donut_legend]: key,
//         [this.aggregationType]: result
//       };
//     });
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer?.nativeElement) {
//       return;
//     }

//     const element = this.chartContainer.nativeElement;
//     d3.select(element).selectAll('*').remove();

//     if (!this.Donut_legend || !this.Donut_value || !data?.length) {
//       d3.select(element)
//         .append('div')
//         .text('Please select both Legend and Value fields to display chart.')
//         .style('color', '#999')
//         .style('font-size', '14px')
//         .style('padding', '1rem')
//         .style('text-align', 'center');
//       return;
//     }

//     const containerRect = element.getBoundingClientRect();
//     const width = containerRect.width;
//     const height = containerRect.height;
//     const radius = Math.min(width, height) / 2.5;
//     const hasManyItems = data.length > 8;

//     const wrapper = d3
//       .select(element)
//       .append('div')
//       .style('display', 'flex')
//       .style('width', '100%')
//       .style('height', '100%')
//       .style('position', 'relative');

//     const chartDiv = wrapper
//       .append('div')
//       .style('flex', hasManyItems ? '0 0 calc(100% - 160px)' : '1')
//       .style('position', 'relative');

//     const svg = chartDiv
//       .append('svg')
//       .attr('width', hasManyItems ? width - 160 : width)
//       .attr('height', height)
//       .append('g')
//       .attr('transform', `translate(${(hasManyItems ? width - 160 : width) / 2}, ${height / 2})`);

//     const tooltip = this.createTooltip(element);
//     const color = d3.scaleOrdinal(d3.schemeCategory10);

//     const pie = d3.pie<any>().value((d) => +d[this.aggregationType]).sort(null);
//     const arc = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius); // Inner radius for donut effect
//     const labelArc = d3.arc<any>().innerRadius(radius * 0.75).outerRadius(radius * 0.75);

//     const arcs = svg
//       .selectAll('.arc')
//       .data(pie(data))
//       .enter()
//       .append('g')
//       .attr('class', 'arc');

//     arcs
//       .append('path')
//       .attr('d', arc)
//       .attr('fill', (d, i) => color(i.toString()))
//       .on('mousemove', (event, d) => {
//         const [mouseX, mouseY] = d3.pointer(event, element);
//         tooltip
//           .style('opacity', 1)
//           .html(
//             `<strong>${this.Donut_legend}:</strong> ${d.data[this.Donut_legend]}<br>` +
//             `<strong>${this.aggregationType}:</strong> ${d.data[this.aggregationType]}`
//           )
//           .style('left', `${mouseX + 20}px`)
//           .style('top', `${mouseY}px`);
//       })
//       .on('mouseleave', () => tooltip.style('opacity', 0))
//       .on('click', (_, d) => this.showSwalTable(d.data));

//     if (!hasManyItems) {
//       arcs
//         .append('text')
//         .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
//         .attr('dy', '0.35em')
//         .style('text-anchor', 'middle')
//         .style('font-size', '12px')
//         .text((d) => d.data[this.Donut_legend]);
//     } else {
//       wrapper
//         .append('div')
//         .style('width', '1px')
//         .style('background-color', '#ccc')
//         .style('margin', '0 10px');

//       const legend = wrapper
//         .append('div')
//         .attr('class', 'donut-legend-scroll')
//         .style('width', '140px')
//         .style('overflow-y', 'auto')
//         .style('max-height', `${height - 40}px`)
//         .style('padding', '4px 8px');

//       data.forEach((d, i) => {
//         legend
//           .append('div')
//           .style('display', 'flex')
//           .style('align-items', 'center')
//           .style('margin-bottom', '6px')
//           .html(
//             `<div style="width: 12px; height: 12px; background-color: ${color(i.toString())}; margin-right: 6px;"></div>` +
//             `<span style="font-size: 12px;">${d[this.Donut_legend]}</span>`
//           );
//       });
//     }
//   }

//   // showSwalTable(d: any): void {
//   //   const matchingRows = this.chartData.filter((row) => row[this.Donut_legend] === d[this.Donut_legend]);
//   //   console.log('----------bar----------------', matchingRows);
//   //   this.chartDataService.Onpostrelationdata(matchingRows);

//   //   this.activedata = [...matchingRows];
//   //   this.ngOnInit();
//   // }

//   showSwalTable(d: any): void {
//     // Filter rows matching the selected legend
//     const matchingRows = this.chartData.filter(
//       (row) => row[this.Donut_legend] === d[this.Donut_legend]
//     );

//     // Get unique legend values (no duplicates)
//     const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Donut_legend]))];

//     // Format as { Donut_legend: [value1, value2, ...] }
//     const formattedData = {
//       [this.Donut_legend]: uniqueValues
//     };

//     console.log('----------formatted donut data----------------', formattedData);

//     // Send formatted data to service
//     this.chartDataService.Onpostrelationdata(formattedData);

//     // Keep full data for active usage
//     this.activedata = [...matchingRows];
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
//     console.log(`${this.label} Donut Chart Summary:`, summary);
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
//       Donut_legend: this.data2,
//       Donut_value: this.data3,
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Donut';
//     this.aggregationFields = {};
//     this.Donut_legend = '';
//     this.Donut_value = '';
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.showCharts = true;

//     this.editClickeds.emit({
//       label: this.label,
//       selectchartfunction: false
//     });
//     this.OnuniqueIdremove();
//     if (this.hasViewInitialized) {
//       this.renderChart([]);
//     }
//     this.getSummaryStats([]);
//   }

//   OnuniqueIdremove(): void {
//     this.deleteChart.emit(this.uniqueId);
//   }
// }