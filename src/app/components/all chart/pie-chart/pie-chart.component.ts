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
  Pie_legend: string;
  Pie_value: string;
  uniqueIddata: any;
  aggregationFields: { [key: string]: string };
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
  imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
})
export class PieChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() label: string = 'Pie';
  @Input() aggregationFields: { [key: string]: string } = {};
  @Input() Pie_legend: string = '';
  @Input() Pie_value: string = '';
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
        if (this.Pie_legend && this.Pie_value && this.aggregatedData?.length) {
          this.renderChart(this.aggregatedData);
        } else {
          this.renderChart([]);
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
    if (this.Pie_legend && this.Pie_value && this.aggregatedData?.length) {
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
        this.data2 = data.Pie_legend || this.Pie_legend;
        this.data3 = data.Pie_value || this.Pie_value;
        console.log('Pie_legend:', this.data2);
        console.log('Pie_value:', this.data3);

        if (data?.data?.length) {
          this.chartData = data.data;
          this.highlightSet.clear();
          if (data.activedata?.length && this.Pie_legend) {
            data.activedata.forEach((row: any) => {
              this.highlightSet.add(row[this.Pie_legend]);
            });
          }

          this.aggregationFields = data.aggregationFields || {};
          this.aggregationType = data.fields[0] || 'Count';

          const aggKeys = Object.keys(this.aggregationFields);
          this.aggregationFieldKey = aggKeys[0] || '';
          const [legend, value] = this.aggregationFieldKey.split('.') ?? [];

          this.Pie_legend = data.Pie_legend?.[0]?.split('.')[0] || legend || '';
          this.Pie_value = data.Pie_value?.[0]?.split('.')[0] || value || '';

          if (this.Pie_legend && this.Pie_value) {
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
    if (!data?.length || !this.Pie_legend || !this.Pie_value) {
      return [];
    }

    const grouped = d3.group(data, (d) => d[this.Pie_legend]);

    return Array.from(grouped, ([key, values]) => {
      const valuesList = values
        .map((v) => +v[this.Pie_value])
        .filter((v) => !isNaN(v));
      let result: number | string = 0;

      switch (this.aggregationType) {
        case 'Count':
          result = values.length;
          break;
        case 'Count Distinct':
          result = new Set(values.map((v) => v[this.Pie_value])).size;
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
        [this.Pie_legend]: key,
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

    if (!this.Pie_legend || !this.Pie_value || !data?.length) {
      d3.select(element)
        .append('div')
        .text('Please select both Legend and Value fields to display chart.')
        .style('color', '#999')
        .style('font-size', '14px')
        .style('padding', '1rem')
        .style('text-align', 'center')
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);
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
    const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius * 0.6);
    
    // Create arc for animation (starts from center)
    const arcEnter = d3.arc<any>().innerRadius(0).outerRadius(0);

    const arcs = svg
      .selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc')
      .style('opacity', 0);

    // Animate arc groups
    arcs
      .transition()
      .delay((d: any, i: number) => i * 100) // Staggered animation
      .duration(800)
      .style('opacity', 1);

    const paths = arcs
      .append('path')
      .attr('d', arcEnter) // Start with center point
      .attr('fill', (d: any) => d.data.isHighlighted ? '#ccc' : color(d.index.toString()))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mousemove', (event: any, d: any) => {
        const [mouseX, mouseY] = d3.pointer(event, element);
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 1)
          .style('transform', 'translateY(0)');
        
        // Update tooltip content separately
        d3.select(tooltip.node())
          .html(
            `<strong>${this.Pie_legend}:</strong> ${d.data[this.Pie_legend]}<br>` +
            `<strong>${this.aggregationType}:</strong> ${d.data[this.aggregationType]}`
          )
          .style('left', `${mouseX + 20}px`)
          .style('top', `${mouseY}px`);
      })
      .on('mouseleave', () => {
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0)
          .style('transform', 'translateY(-10px)');
      })
      .on('click', (_: any, d: any) => this.showSwalTable(d.data));

    // Animate pie segments growing from center
    paths
      .transition()
      .delay((d: any, i: number) => i * 100) // Staggered animation
      .duration(1000)
      .ease(d3.easeBounceOut)
      .attr('d', arc)
      .on('end', function(this: SVGPathElement) {
        // Add hover animations after initial animation completes
        d3.select(this)
          .on('mouseenter', function(this: SVGPathElement) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('transform', (d: any, i: number) => {
                const centroid = arc.centroid(d);
                const x = centroid[0] * 0.1;
                const y = centroid[1] * 0.1;
                return `translate(${x}, ${y})`;
              })
              .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))');
          })
          .on('mouseleave', function(this: SVGPathElement) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('transform', 'translate(0, 0)')
              .attr('filter', null);
          });
      });

    if (!hasManyItems) {
      const textElements = arcs
        .append('text')
        .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('opacity', 0)
        .text((d: any) => d.data[this.Pie_legend]);
      
      // Animate text elements
      textElements
        .transition()
        .delay((d: any, i: number) => (i * 100) + 500) // Start after pie segments
        .duration(400)
        .style('opacity', 1);
    } else {
      wrapper
        .append('div')
        .style('width', '1px')
        .style('background-color', '#ccc')
        .style('margin', '0 10px');

      const legend = wrapper
        .append('div')
        .attr('class', 'pie-legend-scroll')
        .style('width', '140px')
        .style('overflow-y', 'auto')
        .style('max-height', `${height - 40}px`)
        .style('padding', '4px 8px');

      data.forEach((d: any, i: number) => {
        const legendItem = legend
          .append('div')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('margin-bottom', '6px')
          .style('opacity', 0)
          .style('transform', 'translateX(-20px)')
          .html(
            `<div style="width: 12px; height: 12px; background-color: ${d.isHighlighted ? '#007bff' : color(i.toString())}; margin-right: 6px;"></div>` +
            `<span style="font-size: 12px;">${d[this.Pie_legend]}</span>`
          );
        
        // Animate legend items
        legendItem
          .transition()
          .delay((i * 50) + 800) // Start after pie animation
          .duration(300)
          .style('opacity', 1)
          .style('transform', 'translateX(0)');
      });
    }
  }

  showSwalTable(d: any): void {
    // Filter rows matching the selected legend
    const matchingRows = this.chartData.filter(
      (row) => row[this.Pie_legend] === d[this.Pie_legend]
    );

    // Get unique legend values (no duplicates)
    const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Pie_legend]))];

    // Format as { Pie_legend: [value1, value2, ...] }
    const formattedData = {
      [this.Pie_legend]: uniqueValues
    };

    console.log('----------formatted pie data----------------', formattedData);

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
      .style('opacity', '0')
      .style('transform', 'translateY(-10px)')
      .style('transition', 'opacity 0.2s ease, transform 0.2s ease')
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
      .style('z-index', '1000');
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

  // Add method for smooth data transitions
  private animateDataUpdate(oldData: any[], newData: any[]): void {
    if (!this.chartContainer?.nativeElement) return;

    const element = this.chartContainer.nativeElement;
    const svg = d3.select(element).select('svg g');
    
    if (svg.empty()) return;

    // Animate exit of old segments
    svg.selectAll('.arc')
      .data(oldData, (d: any) => d[this.Pie_legend])
      .exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .attr('transform', 'scale(0)')
      .remove();

    // Animate update of existing segments
    const updateSelection = svg.selectAll('.arc')
      .data(newData, (d: any) => d[this.Pie_legend]);

    updateSelection
      .transition()
      .duration(500)
      .ease(d3.easeQuadInOut)
      .style('opacity', 1);

    // Animate enter of new segments
    const enterSelection = updateSelection
      .enter()
      .append('g')
      .attr('class', 'arc')
      .style('opacity', 0);

    enterSelection
      .append('path')
      .attr('d', d3.arc().innerRadius(0).outerRadius(0))
      .attr('fill', (d, i) => d.data.isHighlighted ? '#ccc' : d3.schemeCategory10[i])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .delay((d, i) => i * 100)
      .duration(600)
      .ease(d3.easeBounceOut)
      .attr('d', d3.arc().innerRadius(0).outerRadius(Math.min(
        this.chartContainer.nativeElement.getBoundingClientRect().width,
        this.chartContainer.nativeElement.getBoundingClientRect().height
      ) / 2.5))
      .style('opacity', 1);
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
      Pie_legend: this.data2,
      Pie_value: this.data3,
      uniqueIddata: this.uniqueId,
      aggregationFields: this.aggregationFields,
      selectchartfunction: true
    });
  }

  onDeleteFromChild(): void {
    this.label = 'Pie';
    this.aggregationFields = {};
    this.Pie_legend = '';
    this.Pie_value = '';
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
//   Pie_legend: string;
//   Pie_value: string;
//   uniqueIddata: any;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-pie-chart',
//   standalone: true,
//   templateUrl: './pie-chart.component.html',
//   styleUrls: ['./pie-chart.component.scss'],
//   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule]
// })
// export class PieChartComponent implements OnInit, AfterViewInit, OnDestroy {
//   @Input() label: string = 'Pie';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() Pie_legend: string = '';
//   @Input() Pie_value: string = '';
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
//         if (this.Pie_legend && this.Pie_value && this.aggregatedData?.length) {
//           this.renderChart(this.aggregatedData);
//         } else {
//           this.renderChart([]);
//         }
//       });
//       this.resizeObserver.observe(this.chartContainer.nativeElement);
//     }
//     if (this.Pie_legend && this.Pie_value && this.aggregatedData?.length) {
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
//         this.data2 = data.Pie_legend || this.Pie_legend;
//         this.data3 = data.Pie_value || this.Pie_value;
//         console.log('Pie_legend:', this.data2);
//         console.log('Pie_value:', this.data3);

//         if (data?.data?.length) {
//           this.chartData = data.data;
//           this.aggregationFields = data.aggregationFields || {};
//           this.aggregationType = data.fields[0] || 'Count';

//           const aggKeys = Object.keys(this.aggregationFields);
//           this.aggregationFieldKey = aggKeys[0] || '';
//           const [legend, value] = this.aggregationFieldKey.split('.') ?? [];

//           this.Pie_legend = data.Pie_legend?.[0]?.split('.')[0] || legend || '';
//           this.Pie_value = data.Pie_value?.[0]?.split('.')[0] || value || '';

//           if (this.Pie_legend && this.Pie_value) {
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
//     if (!data?.length || !this.Pie_legend || !this.Pie_value) {
//       return [];
//     }

//     const grouped = d3.group(data, (d) => d[this.Pie_legend]);

//     return Array.from(grouped, ([key, values]) => {
//       const valuesList = values
//         .map((v) => +v[this.Pie_value])
//         .filter((v) => !isNaN(v));
//       let result: number | string = 0;

//       switch (this.aggregationType) {
//         case 'Count':
//           result = values.length;
//           break;
//         case 'Count Distinct':
//           result = new Set(values.map((v) => v[this.Pie_value])).size;
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
//         [this.Pie_legend]: key,
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

//     if (!this.Pie_legend || !this.Pie_value || !data?.length) {
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
//     const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);
//     const labelArc = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

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
//             `<strong>${this.Pie_legend}:</strong> ${d.data[this.Pie_legend]}<br>` +
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
//         .text((d) => d.data[this.Pie_legend]);
//     } else {
//       wrapper
//         .append('div')
//         .style('width', '1px')
//         .style('background-color', '#ccc')
//         .style('margin', '0 10px');

//       const legend = wrapper
//         .append('div')
//         .attr('class', 'pie-legend-scroll')
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
//             `<span style="font-size: 12px;">${d[this.Pie_legend]}</span>`
//           );
//       });
//     }
//   }

//   // showSwalTable(d: any): void {
//   //   const matchingRows = this.chartData.filter((row) => row[this.Pie_legend] === d[this.Pie_legend]);
//   //   console.log('----------bar----------------', matchingRows);
//   //   this.chartDataService.Onpostrelationdata(matchingRows);

//   //   this.activedata = [...matchingRows];
//   //   this.ngOnInit();
//   // }

  // showSwalTable(d: any): void {
  //   // Filter rows matching the selected legend
  //   const matchingRows = this.chartData.filter(
  //     (row) => row[this.Pie_legend] === d[this.Pie_legend]
  //   );

  //   // Get unique legend values (no duplicates)
  //   const uniqueValues = [...new Set(matchingRows.map((row) => row[this.Pie_legend]))];

  //   // Format as { Pie_legend: [value1, value2, ...] }
  //   const formattedData = {
  //     [this.Pie_legend]: uniqueValues
  //   };

  //   console.log('----------formatted pie data----------------', formattedData);

  //   // Send formatted data to service
  //   this.chartDataService.Onpostrelationdata(formattedData);

  //   // Keep full data for active usage
  //   this.activedata = [...matchingRows];
  //   this.ngOnInit();
  // }


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

//   handleClick(event: MouseEvent): void {
//     const target = event.target as HTMLElement;
//     if (target.closest('.delete-button') || target.closest('.example-handle')) {
//       return;
//     }
//     this.editClicked.emit({
//       label: this.label,
//       aggregationFieldKey: this.aggregationFieldKey,
//       aggregationType: this.aggregationType,
//       Pie_legend: this.data2,
//       Pie_value: this.data3,
//       uniqueIddata: this.uniqueId,
//       aggregationFields: this.aggregationFields,
//       selectchartfunction: true
//     });
//   }

//   onDeleteFromChild(): void {
//     this.label = 'Pie';
//     this.aggregationFields = {};
//     this.Pie_legend = '';
//     this.Pie_value = '';
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


