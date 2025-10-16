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
// import { CoreService } from '../../../services/core.service';
// import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import Swal from 'sweetalert2';
// import { MaterialImportsModule } from "../../../material.imports";

// // Interface for chart edit event
// export interface ChartEditEvent {
//   label: string;
//   aggregationFieldKey: string;
//   aggregationType: string;
//   Bar_x_Axis: string;
//   uniqueIddata: any;
//   Bar_y_Axis: string;
//   aggregationFields: { [key: string]: string };
//   selectchartfunction: boolean;
// }

// // Interface for delete chart event
// export interface DeleteChartEdits {
//   label: string;
//   selectchartfunction: boolean;
// }

// @Component({
//   selector: 'app-bar-chart',
//   standalone: true,
//   templateUrl: './bar-chart.component.html',
//   styleUrls: ['./bar-chart.component.scss'],
//   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialImportsModule]
// })
// export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
//   @Input() label: string = 'Bar';
//   @Input() aggregationFields: { [key: string]: string } = {};
//   @Input() Bar_x_Axis: string = '';
//   @Input() Bar_y_Axis: string = '';
//   @Input() uniqueId: any = '';
//   @Input() title: string = '';
//   @Input() Titles: string = '';
//   @Input() showCharts: boolean = false;
//   @Input() Ondata: string = '';
//   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

//   @Output() editClicked = new EventEmitter<ChartEditEvent>();
//   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
//   @Output() deleteChart = new EventEmitter<any>();

//   private dataSubscription?: Subscription;
//   private resizeObserver?: ResizeObserver;
//   private hasViewInitialized: boolean = false;
//   private chartData: any[] = [];
//   private aggregatedData: any[] = [];
//   private aggregationType: string = 'Count';
//   private aggregationFieldKey: string = '';
//   private data2: string = '';
//   private data3: string = '';
//   private highlightSet: Set<any> = new Set(); // For highlighting based on activedata

//   constructor(private chartDataService: CoreService) { }

//   ngOnInit(): void {
//     this.itchartdata();
//     console.log('Title:', this.title);
//     console.log('Ondata:', this.Ondata);
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
//   activedata: any[] = [];
//   ngOnDestroy(): void {
//     this.dataSubscription?.unsubscribe();
//     this.resizeObserver?.disconnect();
//   }

//   itchartdata(): void {
//     this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
//       next: (data) => {
//         // console.log('Received data:', data);
//         // console.log('Received uniqueIddata:', data.uniqueIddata);
//         // console.log('Received field:', data.fields[0]);
//         // console.log('Activedata data:', data.activedata);

//         if (this.uniqueId !== data.uniqueIddata) {
//           return; // Only process if uniqueId matches
//         }

//         this.showCharts = false;
//         this.data2 = data.Bar_x_Axis || '';
//         this.data3 = data.Bar_y_Axis || '';
//         // console.log('Bar_x_Axis:', this.data2);

//         if (data?.data?.length) {
//           this.chartData = data.data;
//           this.highlightSet.clear();
//           if (data.activedata?.length && this.Bar_x_Axis) {
//             data.activedata.forEach((row: any) => {
//               this.highlightSet.add(row[this.Bar_x_Axis]);
//             });
//           }

//           this.aggregationFields = data.aggregationFields || {};
//           this.aggregationType = data.fields[0] || 'Count';

//           const aggKeys = Object.keys(this.aggregationFields);
//           this.aggregationFieldKey = aggKeys[0] || '';
//           const [xField, yField] = this.aggregationFieldKey.split('.');

//           this.Bar_x_Axis = data.Bar_x_Axis?.[0]?.split('.')[0] || xField || '';
//           this.Bar_y_Axis = data.Bar_y_Axis?.[0]?.split('.')[0] || yField || '';

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
//       uniqueIddata: this.uniqueId,
//       Bar_x_Axis: this.data2,
//       Bar_y_Axis: this.data3,
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
//     this.label = 'Bar';
//     this.aggregationFields = {};
//     this.Bar_x_Axis = '';
//     this.Bar_y_Axis = '';
//     this.aggregationType = '';
//     this.chartData = [];
//     this.aggregatedData = [];
//     this.highlightSet.clear();
//     this.showCharts = true;

//     if (this.hasViewInitialized) {
//       this.renderChart([]);
//     }
//     this.getSummaryStats([]);
//   }

//   aggregateData(data: any[]): any[] {
//     if (!data?.length || !this.Bar_x_Axis || !this.Bar_y_Axis) {
//       return [];
//     }

//     const xKey = this.Bar_x_Axis;
//     const yKey = this.Bar_y_Axis;
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
//       const isHighlighted = this.highlightSet.has(groupKey);
//       return { [xKey]: groupKey, [agg]: result, isHighlighted };
//     });
//   }

//   isHorizontalChart(): boolean {
//     const sample = this.chartData?.[0];
//     return sample && !isNaN(+sample[this.aggregationType]) && isNaN(+sample[this.Bar_x_Axis]);
//   }

//   renderChart(data: any[]): void {
//     if (!this.chartContainer?.nativeElement) {
//       return;
//     }

//     const element = this.chartContainer.nativeElement;
//     d3.select(element).selectAll('*').remove();

//     const margin = { top: 20, right: 20, bottom: 100, left: 100 };
//     const containerRect = element.getBoundingClientRect();
//     const widthPerBar = 80;
//     const totalWidth = data.length * widthPerBar;
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

//     const hasX = !!this.Bar_x_Axis;
//     const hasY = !!this.Bar_y_Axis;
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
//       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
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
//         .text(`Only "${this.Bar_x_Axis}" selected. No values to chart.`);
//       return;
//     }

//     const isHorizontal = this.isHorizontalChart();
//     const axisField = this.aggregationType;

//     data.sort((a, b) => +b[axisField] - +a[axisField]);

//     if (isHorizontal) {
//       const y = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, height]).padding(0.2);
//       const x = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([0, width]);

//       svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');
//       svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));

//       svg
//         .selectAll('.bar')
//         .data(data)
//         .enter()
//         .append('rect')
//         .attr('class', 'bar')
//         .attr('y', (d) => y(d[this.Bar_x_Axis])!)
//         .attr('height', y.bandwidth())
//         .attr('x', 0)
//         .attr('width', (d) => x(+d[axisField]))
//         .attr('fill', (d) => d.isHighlighted ? '#007bff' : '#ccc') // Updated: Non-highlighted bars use #ccc
//         .on('mousemove', (event, d) => {
//           const [mx, my] = d3.pointer(event, element);
//           tooltip
//             .style('opacity', 1)
//             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
//             .style('left', `${mx + 20}px`)
//             .style('top', `${my}px`);
//         })
//         .on('mouseleave', () => tooltip.style('opacity', 0))
//         .on('click', (_, d) => this.showSwalTable(d));

//       svg
//         .selectAll('.label')
//         .data(data)
//         .enter()
//         .append('text')
//         .text((d) => d[axisField])
//         .attr('x', (d) => x(+d[axisField]) + 5)
//         .attr('y', (d) => y(d[this.Bar_x_Axis])! + y.bandwidth() / 2 + 4)
//         .style('font-size', '12px');
//     } else {
//       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
//       const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([height, 0]);

//       svg
//         .append('g')
//         .attr('transform', `translate(0,${height})`)
//         .call(d3.axisBottom(x))
//         .selectAll('text')
//         .attr('text-anchor', 'end')
//         .attr('transform', 'rotate(-45)')
//         .attr('dx', '-0.8em')
//         .attr('dy', '0.15em')
//         .style('font-size', '12px');

//       svg
//         .append('text')
//         .attr('text-anchor', 'middle')
//         .attr('x', width / 2)
//         .attr('y', height + margin.bottom - 30)
//         .text(this.Bar_x_Axis)
//         .style('font-size', '14px');

//       svg.append('g').call(d3.axisLeft(y));
//       svg
//         .append('text')
//         .attr('text-anchor', 'middle')
//         .attr('transform', 'rotate(-90)')
//         .attr('x', -height / 2)
//         .attr('y', -margin.left + 20)
//         .text(`${this.aggregationType} (${this.Bar_y_Axis})`)
//         .style('font-size', '14px');

//       svg
//         .selectAll('.bar')
//         .data(data)
//         .enter()
//         .append('rect')
//         .attr('class', 'bar')
//         .attr('x', (d) => x(d[this.Bar_x_Axis])!)
//         .attr('width', x.bandwidth())
//         .attr('y', (d) => y(+d[axisField]))
//         .attr('height', (d) => height - y(+d[axisField]))
//         .attr('fill', (d) => d.isHighlighted ? 'red' : '#ccc') // Updated: Non-highlighted bars use #ccc
//         .on('mousemove', (event, d) => {
//           const [mx, my] = d3.pointer(event, element);
//           tooltip
//             .style('opacity', 1)
//             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
//             .style('left', `${mx + 20}px`)
//             .style('top', `${my}px`);
//         })
//         .on('mouseleave', () => tooltip.style('opacity', 0))
//         .on('click', (_, d) => this.showSwalTable(d));

//       svg
//         .selectAll('.label')
//         .data(data)
//         .enter()
//         .append('text')
//         .text((d) => d[axisField])
//         .attr('x', (d) => x(d[this.Bar_x_Axis])! + x.bandwidth() / 2)
//         .attr('y', (d) => y(+d[axisField]) - 5)
//         .attr('text-anchor', 'middle')
//         .style('font-size', '12px');
//     }
//   }

//   // showSwalTable(d: any): void {
//   //   const fullData = this.chartData.filter((row) => row[this.Bar_x_Axis] === d[this.Bar_x_Axis]);
//   //   console.log('----------bar----------------', fullData);
//   //   this.chartDataService.Onpostrelationdata(fullData);

//   //   this.activedata = [...fullData];
//   //   this.ngOnInit();
//   // }
//   showSwalTable(d: any): void {
//     // Filter rows where x-axis matches
//     const fullData = this.chartData.filter(
//       (row) => row[this.Bar_x_Axis] === d[this.Bar_x_Axis]
//     );

//     // Get unique x-axis values (no duplicates)
//     const uniqueValues = [...new Set(fullData.map((row) => row[this.Bar_x_Axis]))];

//     // Format as { xAxisFieldName: [data1, data2, ...] }
//     const formattedData = {
//       [this.Bar_x_Axis]: uniqueValues
//     };

//     // console.log('----------formatted x-axis data----------------', formattedData);

//     // Send formatted data to service
//     this.chartDataService.Onpostrelationdata(formattedData);

//     // Still keep full data for active usage
//     this.activedata = [...fullData];
//     // this.ngOnInit();
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
//     // console.log(`${this.label} Chart Summary:`, summary);
//   }
// }







// // import {
// //   Component,
// //   Input,
// //   OnInit,
// //   OnDestroy,
// //   ViewChild,
// //   ElementRef,
// //   AfterViewInit,
// //   Output,
// //   EventEmitter
// // } from '@angular/core';
// // import * as d3 from 'd3';
// // import { Subscription } from 'rxjs';
// // import { CoreService } from 'src/app/services/core.service';
// // import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// // import { FormsModule } from '@angular/forms';
// // import { CommonModule } from '@angular/common';
// // import Swal from 'sweetalert2';
// // import { MaterialModule } from "src/app/material.module";

// // // Interface for chart edit event
// // export interface ChartEditEvent {
// //   label: string;
// //   aggregationFieldKey: string;
// //   aggregationType: string;
// //   Bar_x_Axis: string;
// //   uniqueIddata: any;
// //   Bar_y_Axis: string;
// //   aggregationFields: { [key: string]: string };
// //   selectchartfunction: boolean;
// // }

// // // Interface for delete chart event
// // export interface DeleteChartEdits {
// //   label: string;
// //   selectchartfunction: boolean;
// // }

// // @Component({
// //   selector: 'app-bar-chart',
// //   standalone: true,
// //   templateUrl: './bar-chart.component.html',
// //   styleUrls: ['./bar-chart.component.scss'],
// //   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialModule]
// // })
// // export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
// //   @Input() label: string = 'Bar';
// //   @Input() aggregationFields: { [key: string]: string } = {};
// //   @Input() Bar_x_Axis: string = '';
// //   @Input() Bar_y_Axis: string = '';
// //   @Input() uniqueId: any = '';
// //   @Input() title: string = '';
// //   @Input() Titles: string = '';
// //   @Input() showCharts: boolean = false;
// //   @Input() Ondata: string = '';
// //   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

// //   @Output() editClicked = new EventEmitter<ChartEditEvent>();
// //   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
// //   @Output() deleteChart = new EventEmitter<any>();

// //   private dataSubscription?: Subscription;
// //   private resizeObserver?: ResizeObserver;
// //   private hasViewInitialized: boolean = false;
// //   private chartData: any[] = [];
// //   private aggregatedData: any[] = [];
// //   private aggregationType: string = 'Count';
// //   private aggregationFieldKey: string = '';
// //   private data2: string = '';
// //   private data3: string = '';

// //   constructor(private chartDataService: CoreService) { }

// //   ngOnInit(): void {
// //     this.itchartdata();
// //     console.log('Title:', this.title);
// //     console.log('Ondata:', this.Ondata);
// //   }

// //   ngAfterViewInit(): void {
// //     this.hasViewInitialized = true;
// //     if (this.chartContainer?.nativeElement) {
// //       this.resizeObserver = new ResizeObserver(() => {
// //         if (this.aggregatedData?.length) {
// //           this.renderChart(this.aggregatedData);
// //         }
// //       });
// //       this.resizeObserver.observe(this.chartContainer.nativeElement);
// //     }
// //     if (this.aggregatedData?.length) {
// //       this.renderChart(this.aggregatedData);
// //     }
// //   }
// //   activedata: any[] = [];
// //   ngOnDestroy(): void {
// //     this.dataSubscription?.unsubscribe();
// //     this.resizeObserver?.disconnect();

// //   }

// //   itchartdata(): void {
// //     this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
// //       next: (data) => {
// //         console.log('Received data:', data);
// //         console.log('Received uniqueIddata:', data.uniqueIddata);
// //         console.log('Received field:', data.fields[0]);
// //         console.log('Activedata data:', data.activedata);
// //         // if(data.field[0]){
// //         // }

// //         if (this.uniqueId !== data.uniqueIddata) {
// //           return; // Only process if uniqueId matches
// //         }

// //         this.showCharts = false;
// //         this.data2 = data.Bar_x_Axis || '';
// //         this.data3 = data.Bar_y_Axis || '';
// //         console.log('Bar_x_Axis:', this.data2);
// //         console.log('Bar_y_Axis:', this.data3);

// //         if (data?.data?.length) {
// //           this.chartData = data.data;
// //           this.aggregationFields = data.aggregationFields || {};
// //           this.aggregationType = data.fields[0] || 'Count';

// //           const aggKeys = Object.keys(this.aggregationFields);
// //           this.aggregationFieldKey = aggKeys[0] || '';
// //           const [xField, yField] = this.aggregationFieldKey.split('.');

// //           this.Bar_x_Axis = data.Bar_x_Axis?.[0]?.split('.')[0] || xField || '';
// //           this.Bar_y_Axis = data.Bar_y_Axis?.[0]?.split('.')[0] || yField || '';

// //           this.aggregatedData = this.aggregateData(this.chartData);

// //           if (this.hasViewInitialized) {
// //             this.renderChart(this.aggregatedData);
// //           }

// //           this.getSummaryStats(this.aggregatedData);
// //         }
// //       },
// //       error: (err) => {
// //         console.error('Error fetching chart data:', err);
// //       }
// //     });
// //   }

// //   handleClick(event: MouseEvent): void {
// //     const target = event.target as HTMLElement;
// //     if (target.closest('.delete-button') || target.closest('.example-handle')) {
// //       return;
// //     }
// //     this.editClicked.emit({
// //       label: this.label,
// //       aggregationFieldKey: this.aggregationFieldKey,
// //       aggregationType: this.aggregationType,
// //       uniqueIddata: this.uniqueId,
// //       Bar_x_Axis: this.data2,
// //       Bar_y_Axis: this.data3,
// //       aggregationFields: this.aggregationFields,
// //       selectchartfunction: true
// //     });
// //   }
// //   hidethepage(): void {
// //     this.onDeleteFromChild();
// //     this.editClickeds.emit({
// //       label: this.label,
// //       selectchartfunction: false
// //     });
// //     this.OnuniqueIdremove();


// //   }

// //   OnuniqueIdremove(): void {
// //     this.deleteChart.emit(this.uniqueId);

// //   }

// //   onDeleteFromChild(): void {
// //     this.label = 'Bar';
// //     this.aggregationFields = {};
// //     this.Bar_x_Axis = '';
// //     this.Bar_y_Axis = '';
// //     this.aggregationType = '';
// //     this.chartData = [];
// //     this.aggregatedData = [];
// //     this.showCharts = true;

// //     if (this.hasViewInitialized) {
// //       this.renderChart([]);
// //     }
// //     this.getSummaryStats([]);
// //   }

// //   aggregateData(data: any[]): any[] {
// //     if (!data?.length || !this.Bar_x_Axis || !this.Bar_y_Axis) {
// //       return [];
// //     }

// //     const xKey = this.Bar_x_Axis;
// //     const yKey = this.Bar_y_Axis;
// //     const agg = this.aggregationType;
// //     const grouped = d3.group(data, (d) => d[xKey]);

// //     return Array.from(grouped, ([groupKey, values]) => {
// //       const yValues = values
// //         .map((v) => +v[yKey])
// //         .filter((v) => !isNaN(v));
// //       let result: number | string = 0;
// //       switch (agg) {
// //         case 'Count':
// //           result = values.length;
// //           break;
// //         case 'Count Distinct':
// //           result = new Set(values.map((v) => v[yKey])).size;
// //           break;
// //         case 'Sum':
// //           result = d3.sum(yValues).toFixed(2);
// //           break;
// //         case 'Average':
// //           result = yValues.length ? (d3.sum(yValues) / yValues.length).toFixed(2) : '0';
// //           break;
// //         case 'Min':
// //           result = d3.min(yValues) ?? 0;
// //           break;
// //         case 'Max':
// //           result = d3.max(yValues) ?? 0;
// //           break;
// //         default:
// //           result = d3.sum(yValues);
// //       }
// //       return { [xKey]: groupKey, [agg]: result };
// //     });
// //   }

// //   isHorizontalChart(): boolean {
// //     const sample = this.chartData?.[0];
// //     return sample && !isNaN(+sample[this.aggregationType]) && isNaN(+sample[this.Bar_x_Axis]);
// //   }

// //   renderChart(data: any[]): void {
// //     if (!this.chartContainer?.nativeElement) {
// //       return;
// //     }

// //     const element = this.chartContainer.nativeElement;
// //     d3.select(element).selectAll('*').remove();

// //     const margin = { top: 20, right: 20, bottom: 100, left: 100 };
// //     const containerRect = element.getBoundingClientRect();
// //     const widthPerBar = 80;
// //     const totalWidth = data.length * widthPerBar;
// //     const containerWidth = containerRect.width;
// //     const width = Math.max(totalWidth, containerWidth) - margin.left - margin.right;
// //     const height = containerRect.height - margin.top - margin.bottom;

// //     const svg = d3
// //       .select(element)
// //       .append('svg')
// //       .attr('width', width + margin.left + margin.right)
// //       .attr('height', height + margin.top + margin.bottom)
// //       .style('overflow-x', 'auto')
// //       .append('g')
// //       .attr('transform', `translate(${margin.left},${margin.top})`);

// //     const tooltip = this.createTooltip(element);
// //     const color = d3.scaleOrdinal(d3.schemeCategory10);

// //     const hasX = !!this.Bar_x_Axis;
// //     const hasY = !!this.Bar_y_Axis;
// //     const hasAgg = !!this.aggregationType;

// //     if (!hasX) {
// //       svg
// //         .append('text')
// //         .text('No X-Axis selected.')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px');
// //       return;
// //     }

// //     if (!hasY || !hasAgg) {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0, ${height / 2})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '14px');
// //       svg
// //         .append('text')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2 + 40)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px')
// //         .text(`Only "${this.Bar_x_Axis}" selected. No values to chart.`);
// //       return;
// //     }

// //     const isHorizontal = this.isHorizontalChart();
// //     const axisField = this.aggregationType;

// //     // Sort data in descending order
// //     data.sort((a, b) => +b[axisField] - +a[axisField]);

// //     if (isHorizontal) {
// //       const y = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, height]).padding(0.2);
// //       const x = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([0, width]);

// //       svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');
// //       svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));

// //       svg
// //         .selectAll('.bar')
// //         .data(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('y', (d) => y(d[this.Bar_x_Axis])!)
// //         .attr('height', y.bandwidth())
// //         .attr('x', 0)
// //         .attr('width', (d) => x(+d[axisField]))
// //         .attr('fill', (_, i) => color(i.toString()))
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (_, d) => this.showSwalTable(d));

// //       svg
// //         .selectAll('.label')
// //         .data(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(+d[axisField]) + 5)
// //         .attr('y', (d) => y(d[this.Bar_x_Axis])! + y.bandwidth() / 2 + 4)
// //         .style('font-size', '12px');
// //     } else {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
// //       const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([height, 0]);

// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0,${height})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'end')
// //         .attr('transform', 'rotate(-45)')
// //         .attr('dx', '-0.8em')
// //         .attr('dy', '0.15em')
// //         .style('font-size', '12px');

// //       // X Axis Label
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('x', width / 2)
// //         .attr('y', height + margin.bottom - 30)
// //         .text(this.Bar_x_Axis)
// //         .style('font-size', '14px');

// //       // Y Axis + Label
// //       svg.append('g').call(d3.axisLeft(y));
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('transform', 'rotate(-90)')
// //         .attr('x', -height / 2)
// //         .attr('y', -margin.left + 20)
// //         .text(`${this.aggregationType} (${this.Bar_y_Axis})`)
// //         .style('font-size', '14px');

// //       svg
// //         .selectAll('.bar')
// //         .data(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('x', (d) => x(d[this.Bar_x_Axis])!)
// //         .attr('width', x.bandwidth())
// //         .attr('y', (d) => y(+d[axisField]))
// //         .attr('height', (d) => height - y(+d[axisField]))
// //         .attr('fill', (_, i) => color(i.toString()))
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (_, d) => this.showSwalTable(d));

// //       svg
// //         .selectAll('.label')
// //         .data(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(d[this.Bar_x_Axis])! + x.bandwidth() / 2)
// //         .attr('y', (d) => y(+d[axisField]) - 5)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '12px');
// //     }
// //   }

// //   showSwalTable(d: any): void {
// //     const fullData = this.chartData.filter((row) => row[this.Bar_x_Axis] === d[this.Bar_x_Axis]);
// //     console.log('----------bar----------------', fullData);
// //     this.chartDataService.Onpostrelationdata(fullData);

// //     this.activedata = [...fullData];
// //     this.ngOnInit();
// //   }

// //   createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
// //     return d3
// //       .select(container)
// //       .append('div')
// //       .attr('class', 'd3-tooltip')
// //       .style('position', 'absolute')
// //       .style('background', '#fff')
// //       .style('font-size', '13px')
// //       .style('padding', '6px 12px')
// //       .style('border', '1px solid #ccc')
// //       .style('border-radius', '4px')
// //       .style('pointer-events', 'none')
// //       .style('opacity', '0');
// //   }

// //   getSummaryStats(data: any[]): void {
// //     const values = data.map((d) => +d[this.aggregationType]).filter((v) => !isNaN(v));
// //     const summary = {
// //       total: d3.sum(values),
// //       min: d3.min(values),
// //       max: d3.max(values),
// //       avg: values.length ? (d3.mean(values) || 0).toFixed(2) : '0'
// //     };
// //     console.log(`${this.label} Chart Summary:`, summary);
// //   }
// // }


// // import {
// //   Component,
// //   Input,
// //   OnInit,
// //   OnDestroy,
// //   ViewChild,
// //   ElementRef,
// //   AfterViewInit,
// //   Output,
// //   EventEmitter
// // } from '@angular/core';
// // import * as d3 from 'd3';
// // import { Subscription } from 'rxjs';
// // import { CoreService } from 'src/app/services/core.service';
// // import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// // import { FormsModule } from '@angular/forms';
// // import { CommonModule } from '@angular/common';
// // import Swal from 'sweetalert2';
// // import { MaterialModule } from "src/app/material.module";

// // // Interface for chart edit event
// // export interface ChartEditEvent {
// //   label: string;
// //   aggregationFieldKey: string;
// //   aggregationType: string;
// //   Bar_x_Axis: string;
// //   uniqueIddata: any;
// //   Bar_y_Axis: string;
// //   aggregationFields: { [key: string]: string };
// //   selectchartfunction: boolean;
// // }

// // // Interface for delete chart event
// // export interface DeleteChartEdits {
// //   label: string;
// //   selectchartfunction: boolean;
// // }

// // // Interface for chart data
// // interface ChartData {
// //   [key: string]: string | number;
// // }

// // @Component({
// //   selector: 'app-bar-chart',
// //   standalone: true,
// //   templateUrl: './bar-chart.component.html',
// //   styleUrls: ['./bar-chart.component.scss'],
// //   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialModule]
// // })
// // export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
// //   @Input() label: string = 'Bar';
// //   @Input() aggregationFields: { [key: string]: string } = {};
// //   @Input() Bar_x_Axis: string = '';
// //   @Input() Bar_y_Axis: string = '';
// //   @Input() uniqueId: any = '';
// //   @Input() title: string = '';
// //   @Input() Titles: string = '';
// //   @Input() showCharts: boolean = false;
// //   @Input() Ondata: string = '';
// //   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

// //   @Output() editClicked = new EventEmitter<ChartEditEvent>();
// //   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
// //   @Output() deleteChart = new EventEmitter<any>();

// //   private dataSubscription?: Subscription;
// //   private resizeObserver?: ResizeObserver;
// //   private hasViewInitialized: boolean = false;
// //   private chartData: any[] = [];
// //   private aggregatedData: ChartData[] = [];
// //   private aggregationType: string = 'Count';
// //   private aggregationFieldKey: string = '';
// //   private data2: string = '';
// //   private data3: string = '';
// //   activedata: any[] = [];

// //   constructor(private chartDataService: CoreService) { }

// //   ngOnInit(): void {
// //     this.itchartdata();
// //     console.log('Title:', this.title);
// //     console.log('Ondata:', this.Ondata);
// //     // this.chartDataService.OnrelationData$.subscribe(data => {
// //     //   console.log('Auto-updated data:', data);
// //     // });
// //   }

// //   ngAfterViewInit(): void {
// //     this.hasViewInitialized = true;
// //     if (this.chartContainer?.nativeElement) {
// //       this.resizeObserver = new ResizeObserver(() => {
// //         if (this.aggregatedData?.length) {
// //           this.renderChart(this.aggregatedData);
// //         }
// //       });
// //       this.resizeObserver.observe(this.chartContainer.nativeElement);
// //     }
// //     if (this.aggregatedData?.length) {
// //       this.renderChart(this.aggregatedData);
// //     }
// //   }

// //   ngOnDestroy(): void {
// //     this.dataSubscription?.unsubscribe();
// //     this.resizeObserver?.disconnect();
// //   }

// //   itchartdata(): void {
// //     this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
// //       next: (data) => {
// //         console.log('Received data:', data);
// //         console.log('Received uniqueIddata:', data.uniqueIddata);
// //         console.log('Received field:', data.fields[0]);

// //         if (this.uniqueId !== data.uniqueIddata) {
// //           return; // Only process if uniqueId matches
// //         }

// //         this.showCharts = false;
// //         this.data2 = data.Bar_x_Axis || '';
// //         this.data3 = data.Bar_y_Axis || '';
// //         console.log('Bar_x_Axis:', this.data2);
// //         console.log('Bar_y_Axis:', this.data3);

// //         if (data?.data?.length) {
// //           this.chartData = data.data;
// //           this.aggregationFields = data.aggregationFields || {};
// //           this.aggregationType = data.fields[0] || 'Count';

// //           const aggKeys = Object.keys(this.aggregationFields);
// //           this.aggregationFieldKey = aggKeys[0] || '';
// //           const [xField, yField] = this.aggregationFieldKey.split('.');

// //           this.Bar_x_Axis = data.Bar_x_Axis?.[0]?.split('.')[0] || xField || '';
// //           this.Bar_y_Axis = data.Bar_y_Axis?.[0]?.split('.')[0] || yField || '';

// //           this.aggregatedData = this.aggregateData(this.chartData);

// //           if (this.hasViewInitialized) {
// //             this.renderChart(this.aggregatedData);
// //           }

// //           this.getSummaryStats(this.aggregatedData);
// //         }
// //       },
// //       error: (err) => {
// //         console.error('Error fetching chart data:', err);
// //       }
// //     });
// //   }

// //   handleClick(event: MouseEvent): void {
// //     const target = event.target as HTMLElement;
// //     if (target.closest('.delete-button') || target.closest('.example-handle')) {
// //       return;
// //     }
// //     this.editClicked.emit({
// //       label: this.label,
// //       aggregationFieldKey: this.aggregationFieldKey,
// //       aggregationType: this.aggregationType,
// //       uniqueIddata: this.uniqueId,
// //       Bar_x_Axis: this.data2,
// //       Bar_y_Axis: this.data3,
// //       aggregationFields: this.aggregationFields,
// //       selectchartfunction: true
// //     });
// //   }

// //   hidethepage(): void {
// //     this.onDeleteFromChild();
// //     this.editClickeds.emit({
// //       label: this.label,
// //       selectchartfunction: false
// //     });
// //     this.OnuniqueIdremove();
// //   }

// //   OnuniqueIdremove(): void {
// //     this.deleteChart.emit(this.uniqueId);
// //   }

// //   onDeleteFromChild(): void {
// //     this.label = 'Bar';
// //     this.aggregationFields = {};
// //     this.Bar_x_Axis = '';
// //     this.Bar_y_Axis = '';
// //     this.aggregationType = '';
// //     this.chartData = [];
// //     this.aggregatedData = [];
// //     this.activedata = []; // Clear activedata to show normal colors
// //     this.showCharts = true;

// //     if (this.hasViewInitialized) {
// //       this.renderChart([]);
// //     }
// //     this.getSummaryStats([]);
// //   }

// //   aggregateData(data: any[]): ChartData[] {
// //     if (!data?.length || !this.Bar_x_Axis || !this.Bar_y_Axis) {
// //       return [];
// //     }

// //     const xKey = this.Bar_x_Axis;
// //     const yKey = this.Bar_y_Axis;
// //     const agg = this.aggregationType;
// //     const grouped = d3.group(data, (d) => d[xKey]);

// //     return Array.from(grouped, ([groupKey, values]) => {
// //       const yValues = values
// //         .map((v) => +v[yKey])
// //         .filter((v) => !isNaN(v));
// //       let result: number | string = 0;
// //       switch (agg) {
// //         case 'Count':
// //           result = values.length;
// //           break;
// //         case 'Count Distinct':
// //           result = new Set(values.map((v) => v[yKey])).size;
// //           break;
// //         case 'Sum':
// //           result = d3.sum(yValues).toFixed(2);
// //           break;
// //         case 'Average':
// //           result = yValues.length ? (d3.sum(yValues) / yValues.length).toFixed(2) : '0';
// //           break;
// //         case 'Min':
// //           result = d3.min(yValues) ?? 0;
// //           break;
// //         case 'Max':
// //           result = d3.max(yValues) ?? 0;
// //           break;
// //         default:
// //           result = d3.sum(yValues);
// //       }
// //       return { [xKey]: groupKey, [agg]: result };
// //     });
// //   }

// //   isHorizontalChart(): boolean {
// //     const sample = this.chartData?.[0];
// //     return sample && !isNaN(+sample[this.aggregationType]) && isNaN(+sample[this.Bar_x_Axis]);
// //   }

// //   renderChart(data: ChartData[]): void {
// //     if (!this.chartContainer?.nativeElement) {
// //       return;
// //     }

// //     const element = this.chartContainer.nativeElement;
// //     d3.select(element).selectAll('*').remove();

// //     const margin = { top: 20, right: 20, bottom: 100, left: 100 };
// //     const containerRect = element.getBoundingClientRect();
// //     const widthPerBar = 80;
// //     const totalWidth = data.length * widthPerBar;
// //     const containerWidth = containerRect.width;
// //     const width = Math.max(totalWidth, containerWidth) - margin.left - margin.right;
// //     const height = containerRect.height - margin.top - margin.bottom;

// //     const svg = d3
// //       .select(element)
// //       .append('svg')
// //       .attr('width', width + margin.left + margin.right)
// //       .attr('height', height + margin.top + margin.bottom)
// //       .style('overflow-x', 'auto')
// //       .append('g')
// //       .attr('transform', `translate(${margin.left},${margin.top})`);

// //     const tooltip = this.createTooltip(element);
// //     const color = d3.scaleOrdinal(d3.schemeCategory10);

// //     const hasX = !!this.Bar_x_Axis;
// //     const hasY = !!this.Bar_y_Axis;
// //     const hasAgg = !!this.aggregationType;

// //     if (!hasX) {
// //       svg
// //         .append('text')
// //         .text('No X-Axis selected.')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px');
// //       return;
// //     }

// //     if (!hasY || !hasAgg) {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis] as string)).range([0, width]).padding(0.3);
// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0, ${height / 2})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '14px');
// //       svg
// //         .append('text')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2 + 40)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px')
// //         .text(`Only "${this.Bar_x_Axis}" selected. No values to chart.`);
// //       return;
// //     }

// //     const isHorizontal = this.isHorizontalChart();
// //     const axisField = this.aggregationType;

// //     // Sort data in descending order
// //     data.sort((a, b) => +b[axisField] - +a[axisField]);

// //     // Prepare active data x-axis values for highlighting
// //     const activeXValues = new Set(this.activedata.map((d) => d[this.Bar_x_Axis]));

// //     if (isHorizontal) {
// //       const y = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis] as string)).range([0, height]).padding(0.2);
// //       const x = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([0, width]);

// //       svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');
// //       svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));

// //       svg
// //         .selectAll('.bar')
// //         .data<ChartData>(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('y', (d) => y(d[this.Bar_x_Axis] as string)!)
// //         .attr('height', y.bandwidth())
// //         .attr('x', 0)
// //         .attr('width', (d) => x(+d[axisField]))
// //         .attr('fill', (d, i) => {
// //           if (this.activedata.length === 0) {
// //             return color(i.toString()); // Normal varied colors when activedata is empty
// //           }
// //           return activeXValues.has(d[this.Bar_x_Axis] as string) ? '#0000FF' : '#ccc'; // Blue for active, gray for non-active
// //         })
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (event, d: ChartData) => {
// //           // Apply animation
// //           d3.select(event.currentTarget)
// //             .transition()
// //             .duration(200)
// //             .attr('height', y.bandwidth() * 1.2)
// //             .attr('y', () => y(d[this.Bar_x_Axis] as string)! - y.bandwidth() * 0.1)
// //             .transition()
// //             .duration(200)
// //             .attr('height', y.bandwidth())
// //             .attr('y', () => y(d[this.Bar_x_Axis] as string)!);
// //           this.showSwalTable(d);
// //         });

// //       svg
// //         .selectAll('.label')
// //         .data<ChartData>(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(+d[axisField]) + 5)
// //         .attr('y', (d) => y(d[this.Bar_x_Axis] as string)! + y.bandwidth() / 2 + 4)
// //         .style('font-size', '12px');
// //     } else {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis] as string)).range([0, width]).padding(0.3);
// //       const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([height, 0]);

// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0,${height})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'end')
// //         .attr('transform', 'rotate(-45)')
// //         .attr('dx', '-0.8em')
// //         .attr('dy', '0.15em')
// //         .style('font-size', '12px');

// //       // X Axis Label
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('x', width / 2)
// //         .attr('y', height + margin.bottom - 30)
// //         .text(this.Bar_x_Axis)
// //         .style('font-size', '14px');

// //       // Y Axis + Label
// //       svg.append('g').call(d3.axisLeft(y));
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('transform', 'rotate(-90)')
// //         .attr('x', -height / 2)
// //         .attr('y', -margin.left + 20)
// //         .text(`${this.aggregationType} (${this.Bar_y_Axis})`)
// //         .style('font-size', '14px');

// //       svg
// //         .selectAll('.bar')
// //         .data<ChartData>(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('x', (d) => x(d[this.Bar_x_Axis] as string)!)
// //         .attr('width', x.bandwidth())
// //         .attr('y', (d) => y(+d[axisField]))
// //         .attr('height', (d) => height - y(+d[axisField]))
// //         .attr('fill', (d, i) => {
// //           if (this.activedata.length === 0) {
// //             return color(i.toString()); // Normal varied colors when activedata is empty
// //           }
// //           return activeXValues.has(d[this.Bar_x_Axis] as string) ? '#0000FF' : '#ccc'; // Blue for active, gray for non-active
// //         })
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (event, d: ChartData) => {
// //           // Apply animation
// //           d3.select(event.currentTarget)
// //             .transition()
// //             .duration(200)
// //             .attr('width', x.bandwidth() * 1.2)
// //             .attr('x', () => x(d[this.Bar_x_Axis] as string)! - x.bandwidth() * 0.1)
// //             .transition()
// //             .duration(200)
// //             .attr('width', x.bandwidth())
// //             .attr('x', () => x(d[this.Bar_x_Axis] as string)!);
// //           this.showSwalTable(d);
// //         });

// //       svg
// //         .selectAll('.label')
// //         .data<ChartData>(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(d[this.Bar_x_Axis] as string)! + x.bandwidth() / 2)
// //         .attr('y', (d) => y(+d[axisField]) - 5)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '12px');
// //     }
// //   }

// //   showSwalTable(d: ChartData): void {
// //     const fullData = this.chartData.filter((row) => row[this.Bar_x_Axis] === d[this.Bar_x_Axis]);
// //     console.log('----------bar----------------', fullData);
// //     this.chartDataService.Onpostrelationdata(fullData);

// //     this.activedata = [...fullData];
// //     this.renderChart(this.aggregatedData); // Re-render to update highlighting
// //   }

// //   createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
// //     return d3
// //       .select(container)
// //       .append('div')
// //       .attr('class', 'd3-tooltip')
// //       .style('position', 'absolute')
// //       .style('background', '#fff')
// //       .style('font-size', '13px')
// //       .style('padding', '6px 12px')
// //       .style('border', '1px solid #ccc')
// //       .style('border-radius', '4px')
// //       .style('pointer-events', 'none')
// //       .style('opacity', '0');
// //   }

// //   getSummaryStats(data: ChartData[]): void {
// //     const values = data.map((d) => +d[this.aggregationType]).filter((v) => !isNaN(v));
// //     const summary = {
// //       total: d3.sum(values),
// //       min: d3.min(values),
// //       max: d3.max(values),
// //       avg: values.length ? (d3.mean(values) || 0).toFixed(2) : '0'
// //     };
// //     console.log(`${this.label} Chart Summary:`, summary);
// //   }
// // }















// // import {
// //   Component,
// //   Input,
// //   OnInit,
// //   OnDestroy,
// //   ViewChild,
// //   ElementRef,
// //   AfterViewInit,
// //   Output,
// //   EventEmitter
// // } from '@angular/core';
// // import * as d3 from 'd3';
// // import { Subscription } from 'rxjs';
// // import { CoreService } from 'src/app/services/core.service';
// // import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
// // import { FormsModule } from '@angular/forms';
// // import { CommonModule } from '@angular/common';
// // import Swal from 'sweetalert2';
// // import { MaterialModule } from "src/app/material.module";

// // // Interface for chart edit event
// // export interface ChartEditEvent {
// //   label: string;
// //   aggregationFieldKey: string;
// //   aggregationType: string;
// //   Bar_x_Axis: string;
// //   uniqueIddata: any;
// //   Bar_y_Axis: string;
// //   aggregationFields: { [key: string]: string };
// //   selectchartfunction: boolean;
// // }

// // // Interface for delete chart event
// // export interface DeleteChartEdits {
// //   label: string;
// //   selectchartfunction: boolean;
// // }

// // @Component({
// //   selector: 'app-bar-chart',
// //   standalone: true,
// //   templateUrl: './bar-chart.component.html',
// //   styleUrls: ['./bar-chart.component.scss'],
// //   imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialModule]
// // })
// // export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
// //   @Input() label: string = 'Bar';
// //   @Input() aggregationFields: { [key: string]: string } = {};
// //   @Input() Bar_x_Axis: string = '';
// //   @Input() Bar_y_Axis: string = '';
// //   @Input() uniqueId: any = '';
// //   @Input() title: string = '';
// //   @Input() Titles: string = '';
// //   @Input() showCharts: boolean = false;
// //   @Input() Ondata: string = '';
// //   @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef<HTMLDivElement>;

// //   @Output() editClicked = new EventEmitter<ChartEditEvent>();
// //   @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
// //   @Output() deleteChart = new EventEmitter<any>();

// //   private dataSubscription?: Subscription;
// //   private resizeObserver?: ResizeObserver;
// //   private hasViewInitialized: boolean = false;
// //   private chartData: any[] = [];
// //   private aggregatedData: any[] = [];
// //   private aggregationType: string = 'Count';
// //   private aggregationFieldKey: string = '';
// //   private data2: string = '';
// //   private data3: string = '';
// //   private highlightSet: Set<any> = new Set(); // New: For highlighting based on activedata

// //   constructor(private chartDataService: CoreService) { }

// //   ngOnInit(): void {
// //     this.itchartdata();
// //     console.log('Title:', this.title);
// //     console.log('Ondata:', this.Ondata);
// //   }

// //   ngAfterViewInit(): void {
// //     this.hasViewInitialized = true;
// //     if (this.chartContainer?.nativeElement) {
// //       this.resizeObserver = new ResizeObserver(() => {
// //         if (this.aggregatedData?.length) {
// //           this.renderChart(this.aggregatedData);
// //         }
// //       });
// //       this.resizeObserver.observe(this.chartContainer.nativeElement);
// //     }
// //     if (this.aggregatedData?.length) {
// //       this.renderChart(this.aggregatedData);
// //     }
// //   }
// //   activedata: any[] = [];
// //   ngOnDestroy(): void {
// //     this.dataSubscription?.unsubscribe();
// //     this.resizeObserver?.disconnect();
// //   }

// //   itchartdata(): void {
// //     this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
// //       next: (data) => {
// //         console.log('Received data:', data);
// //         console.log('Received uniqueIddata:', data.uniqueIddata);
// //         console.log('Received field:', data.fields[0]);
// //         console.log('Activedata data:', data.activedata);
// //         // if(data.field[0]){
// //         // }

// //         if (this.uniqueId !== data.uniqueIddata) {
// //           return; // Only process if uniqueId matches
// //         }

// //         this.showCharts = false;
// //         this.data2 = data.Bar_x_Axis || '';
// //         this.data3 = data.Bar_y_Axis || '';
// //         console.log('Bar_x_Axis:', this.data2);
// //         console.log('Bar_y_Axis:', this.data3);

// //         if (data?.data?.length) {
// //           this.chartData = data.data; // Full data for chart creation/aggregation

// //           // New: Compute highlight set from activedata (filtered data)
// //           this.highlightSet.clear();
// //           if (data.activedata?.length && this.Bar_x_Axis) {
// //             data.activedata.forEach((row: any) => {
// //               this.highlightSet.add(row[this.Bar_x_Axis]);
// //             });
// //           }

// //           this.aggregationFields = data.aggregationFields || {};
// //           this.aggregationType = data.fields[0] || 'Count';

// //           const aggKeys = Object.keys(this.aggregationFields);
// //           this.aggregationFieldKey = aggKeys[0] || '';
// //           const [xField, yField] = this.aggregationFieldKey.split('.');

// //           this.Bar_x_Axis = data.Bar_x_Axis?.[0]?.split('.')[0] || xField || '';
// //           this.Bar_y_Axis = data.Bar_y_Axis?.[0]?.split('.')[0] || yField || '';

// //           this.aggregatedData = this.aggregateData(this.chartData);

// //           if (this.hasViewInitialized) {
// //             this.renderChart(this.aggregatedData);
// //           }

// //           this.getSummaryStats(this.aggregatedData);
// //         }
// //       },
// //       error: (err) => {
// //         console.error('Error fetching chart data:', err);
// //       }
// //     });
// //   }

// //   handleClick(event: MouseEvent): void {
// //     const target = event.target as HTMLElement;
// //     if (target.closest('.delete-button') || target.closest('.example-handle')) {
// //       return;
// //     }
// //     this.editClicked.emit({
// //       label: this.label,
// //       aggregationFieldKey: this.aggregationFieldKey,
// //       aggregationType: this.aggregationType,
// //       uniqueIddata: this.uniqueId,
// //       Bar_x_Axis: this.data2,
// //       Bar_y_Axis: this.data3,
// //       aggregationFields: this.aggregationFields,
// //       selectchartfunction: true
// //     });
// //   }
// //   hidethepage(): void {
// //     this.onDeleteFromChild();
// //     this.editClickeds.emit({
// //       label: this.label,
// //       selectchartfunction: false
// //     });
// //     this.OnuniqueIdremove();
// //   }

// //   OnuniqueIdremove(): void {
// //     this.deleteChart.emit(this.uniqueId);
// //   }

// //   onDeleteFromChild(): void {
// //     this.label = 'Bar';
// //     this.aggregationFields = {};
// //     this.Bar_x_Axis = '';
// //     this.Bar_y_Axis = '';
// //     this.aggregationType = '';
// //     this.chartData = [];
// //     this.aggregatedData = [];
// //     this.highlightSet.clear(); // New: Reset highlights
// //     this.showCharts = true;

// //     if (this.hasViewInitialized) {
// //       this.renderChart([]);
// //     }
// //     this.getSummaryStats([]);
// //   }

// //   aggregateData(data: any[]): any[] {
// //     if (!data?.length || !this.Bar_x_Axis || !this.Bar_y_Axis) {
// //       return [];
// //     }

// //     const xKey = this.Bar_x_Axis;
// //     const yKey = this.Bar_y_Axis;
// //     const agg = this.aggregationType;
// //     const grouped = d3.group(data, (d) => d[xKey]);

// //     return Array.from(grouped, ([groupKey, values]) => {
// //       const yValues = values
// //         .map((v) => +v[yKey])
// //         .filter((v) => !isNaN(v));
// //       let result: number | string = 0;
// //       switch (agg) {
// //         case 'Count':
// //           result = values.length;
// //           break;
// //         case 'Count Distinct':
// //           result = new Set(values.map((v) => v[yKey])).size;
// //           break;
// //         case 'Sum':
// //           result = d3.sum(yValues).toFixed(2);
// //           break;
// //         case 'Average':
// //           result = yValues.length ? (d3.sum(yValues) / yValues.length).toFixed(2) : '0';
// //           break;
// //         case 'Min':
// //           result = d3.min(yValues) ?? 0;
// //           break;
// //         case 'Max':
// //           result = d3.max(yValues) ?? 0;
// //           break;
// //         default:
// //           result = d3.sum(yValues);
// //       }
// //       // New: Add highlight flag based on highlightSet
// //       const isHighlighted = this.highlightSet.has(groupKey);
// //       return { [xKey]: groupKey, [agg]: result, isHighlighted };
// //     });
// //   }

// //   isHorizontalChart(): boolean {
// //     const sample = this.chartData?.[0];
// //     return sample && !isNaN(+sample[this.aggregationType]) && isNaN(+sample[this.Bar_x_Axis]);
// //   }

// //   renderChart(data: any[]): void {
// //     if (!this.chartContainer?.nativeElement) {
// //       return;
// //     }

// //     const element = this.chartContainer.nativeElement;
// //     d3.select(element).selectAll('*').remove();

// //     const margin = { top: 20, right: 20, bottom: 100, left: 100 };
// //     const containerRect = element.getBoundingClientRect();
// //     const widthPerBar = 80;
// //     const totalWidth = data.length * widthPerBar;
// //     const containerWidth = containerRect.width;
// //     const width = Math.max(totalWidth, containerWidth) - margin.left - margin.right;
// //     const height = containerRect.height - margin.top - margin.bottom;

// //     const svg = d3
// //       .select(element)
// //       .append('svg')
// //       .attr('width', width + margin.left + margin.right)
// //       .attr('height', height + margin.top + margin.bottom)
// //       .style('overflow-x', 'auto')
// //       .append('g')
// //       .attr('transform', `translate(${margin.left},${margin.top})`);

// //     const tooltip = this.createTooltip(element);
// //     const color = d3.scaleOrdinal(d3.schemeCategory10);

// //     const hasX = !!this.Bar_x_Axis;
// //     const hasY = !!this.Bar_y_Axis;
// //     const hasAgg = !!this.aggregationType;

// //     if (!hasX) {
// //       svg
// //         .append('text')
// //         .text('No X-Axis selected.')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px');
// //       return;
// //     }

// //     if (!hasY || !hasAgg) {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0, ${height / 2})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '14px');
// //       svg
// //         .append('text')
// //         .attr('x', width / 2)
// //         .attr('y', height / 2 + 40)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '16px')
// //         .text(`Only "${this.Bar_x_Axis}" selected. No values to chart.`);
// //       return;
// //     }

// //     const isHorizontal = this.isHorizontalChart();
// //     const axisField = this.aggregationType;

// //     // Sort data in descending order
// //     data.sort((a, b) => +b[axisField] - +a[axisField]);

// //     if (isHorizontal) {
// //       const y = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, height]).padding(0.2);
// //       const x = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([0, width]);

// //       svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '12px');
// //       svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));

// //       svg
// //         .selectAll('.bar')
// //         .data(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('y', (d) => y(d[this.Bar_x_Axis])!)
// //         .attr('height', y.bandwidth())
// //         .attr('x', 0)
// //         .attr('width', (d) => x(+d[axisField]))
// //         .attr('fill', (d) => d.isHighlighted ? 'red' : color((data.indexOf(d)).toString())) // New: Conditional fill for highlight
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (_, d) => this.showSwalTable(d));

// //       svg
// //         .selectAll('.label')
// //         .data(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(+d[axisField]) + 5)
// //         .attr('y', (d) => y(d[this.Bar_x_Axis])! + y.bandwidth() / 2 + 4)
// //         .style('font-size', '12px');
// //     } else {
// //       const x = d3.scaleBand().domain(data.map((d) => d[this.Bar_x_Axis])).range([0, width]).padding(0.3);
// //       const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[axisField]) || 0]).nice().range([height, 0]);

// //       svg
// //         .append('g')
// //         .attr('transform', `translate(0,${height})`)
// //         .call(d3.axisBottom(x))
// //         .selectAll('text')
// //         .attr('text-anchor', 'end')
// //         .attr('transform', 'rotate(-45)')
// //         .attr('dx', '-0.8em')
// //         .attr('dy', '0.15em')
// //         .style('font-size', '12px');

// //       // X Axis Label
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('x', width / 2)
// //         .attr('y', height + margin.bottom - 30)
// //         .text(this.Bar_x_Axis)
// //         .style('font-size', '14px');

// //       // Y Axis + Label
// //       svg.append('g').call(d3.axisLeft(y));
// //       svg
// //         .append('text')
// //         .attr('text-anchor', 'middle')
// //         .attr('transform', 'rotate(-90)')
// //         .attr('x', -height / 2)
// //         .attr('y', -margin.left + 20)
// //         .text(`${this.aggregationType} (${this.Bar_y_Axis})`)
// //         .style('font-size', '14px');

// //       svg
// //         .selectAll('.bar')
// //         .data(data)
// //         .enter()
// //         .append('rect')
// //         .attr('class', 'bar')
// //         .attr('x', (d) => x(d[this.Bar_x_Axis])!)
// //         .attr('width', x.bandwidth())
// //         .attr('y', (d) => y(+d[axisField]))
// //         .attr('height', (d) => height - y(+d[axisField]))
// //         .attr('fill', (d) => d.isHighlighted ? '#007bff' : color((data.indexOf(d)).toString())) // New: Conditional fill for highlight
// //         .on('mousemove', (event, d) => {
// //           const [mx, my] = d3.pointer(event, element);
// //           tooltip
// //             .style('opacity', 1)
// //             .html(`<strong>${this.Bar_x_Axis}:</strong> ${d[this.Bar_x_Axis]}<br><strong>${axisField}:</strong> ${d[axisField]}`)
// //             .style('left', `${mx + 20}px`)
// //             .style('top', `${my}px`);
// //         })
// //         .on('mouseleave', () => tooltip.style('opacity', 0))
// //         .on('click', (_, d) => this.showSwalTable(d));

// //       svg
// //         .selectAll('.label')
// //         .data(data)
// //         .enter()
// //         .append('text')
// //         .text((d) => d[axisField])
// //         .attr('x', (d) => x(d[this.Bar_x_Axis])! + x.bandwidth() / 2)
// //         .attr('y', (d) => y(+d[axisField]) - 5)
// //         .attr('text-anchor', 'middle')
// //         .style('font-size', '12px');
// //     }
// //   }

// //   showSwalTable(d: any): void {
// //     const fullData = this.chartData.filter((row) => row[this.Bar_x_Axis] === d[this.Bar_x_Axis]);
// //     console.log('----------bar----------------', fullData);
// //     this.chartDataService.Onpostrelationdata(fullData);

// //     this.activedata = [...fullData];
// //     this.ngOnInit();
// //   }

// //   createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
// //     return d3
// //       .select(container)
// //       .append('div')
// //       .attr('class', 'd3-tooltip')
// //       .style('position', 'absolute')
// //       .style('background', '#fff')
// //       .style('font-size', '13px')
// //       .style('padding', '6px 12px')
// //       .style('border', '1px solid #ccc')
// //       .style('border-radius', '4px')
// //       .style('pointer-events', 'none')
// //       .style('opacity', '0');
// //   }

// //   getSummaryStats(data: any[]): void {
// //     const values = data.map((d) => +d[this.aggregationType]).filter((v) => !isNaN(v));
// //     const summary = {
// //       total: d3.sum(values),
// //       min: d3.min(values),
// //       max: d3.max(values),
// //       avg: values.length ? (d3.mean(values) || 0).toFixed(2) : '0'
// //     };
// //     console.log(`${this.label} Chart Summary:`, summary);
// //   }
// // }















import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { CoreService } from '../../../services/core.service';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MaterialImportsModule } from '../../../material.imports';

// Interfaces
export interface ChartEditEvent {
  label: string;
  uniqueIddata: any;
  aggregationType: string;
  Bar_x_Axis: string;
  aggregationFieldKey: string;
  Bar_y_Axis: string;
  selectchartfunction: boolean;
}

export interface DeleteChartEdits {
  label: string;
  selectchartfunction: boolean;
}

export interface CustomChartEvent {
  label: string;
  uniqueId: any;
  xAxis: string;
  yAxis: string;
  aggregationType: string;
  aggregationFieldKey: string;
  selectchartfunction: boolean;
  data: any[];
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  imports: [CdkDrag, CdkDragHandle, FormsModule, CommonModule, MaterialImportsModule],
})
export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() label: string = 'Bar';
  @Input() Bar_x_Axis: string = '';
  @Input() Bar_y_Axis: string = '';
  @Input() uniqueId: any = '';
  @Input() title: string = '';
  @Input() aggregationFieldKey: string = '';
  @Input() aggregationType: string = '';
  @Input() showCharts: boolean = true;
  @Input() Ondata: string = '';

  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef<HTMLDivElement>;

  @Output() editClicked = new EventEmitter<ChartEditEvent>();
  @Output() editClickeds = new EventEmitter<DeleteChartEdits>();
  @Output() deleteChart = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();
  @Output() customChartEvent = new EventEmitter<CustomChartEvent>();

  private data: any[] = [];
  private dataSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private hasViewInitialized: boolean = false;
  private highlightSet: Set<any> = new Set();
  private xKey: string = '';
  private yKey: string = '';
  private isResizing: boolean = false;
  private startWidth: number = 0;
  private startHeight: number = 0;
  private startX: number = 0;
  private startY: number = 0;
  private isHorizontal: boolean = false;

  private normalColorStart: string = '#E6F0FA';
  private normalColorEnd: string = '#00A1D6';
  private highlightColor: string = '#FF0000';
  private animationDuration: number = 800;

  xaxis: string = '';
  yaxis: string = '';
  xaxis1: string = '';
  yaxis1: string = '';
  allaxisdata: any = {};

  constructor(
    private chartDataService: CoreService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchChartData();
    console.log('Initialized with:', {
      title: this.title,
      Ondata: this.Ondata,
      Bar_x_Axis: this.Bar_x_Axis,
      Bar_y_Axis: this.Bar_y_Axis,
    });
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    if (this.chartContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.data?.length) {
          this.renderChart(this.data);
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
      window.addEventListener('resize', this.handleResize);
    }
    if (this.data?.length) {
      this.renderChart(this.data);
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.renderChart(this.data);
  };

  private fetchChartData(): void {
    this.dataSubscription = this.chartDataService.getChartData(this.label).subscribe({
      next: (data:any) => {
        if (!data) {
          console.warn('No chart data received');
          return;
        }

        this.xaxis = data.Bar_x_Axis ?? '';
        this.yaxis = data.Bar_y_Axis ?? '';
        this.xaxis1 = data.Bar_x_Axis?.[0]?.split('.')[0] ?? '';
        this.yaxis1 = data.Bar_y_Axis?.[0]?.split('.')[0] ?? '';

        this.aggregationType = data.fields?.[0] ?? 'Count';
        if (this.uniqueId !== data.uniqueIddata) return;

        this.showCharts = false;
        this.data = Array.isArray(data.data) ? data.data : [];
        
        if (this.data.length > 0) {
          const keys = Object.keys(this.data[0] ?? {});
          this.xKey = this.Bar_x_Axis || keys[1] || '';
          this.yKey = this.Bar_y_Axis || keys[2] || '';
        } else {
          this.xKey = this.Bar_x_Axis || '';
          this.yKey = this.Bar_y_Axis || '';
        }

        if (this.data.length) {
          this.highlightSet.clear();
          if (Array.isArray(data.activedata) && this.xKey) {
            data.activedata.forEach((row: any) => {
              if (row?.[this.xKey] != null) {
                this.highlightSet.add(row[this.xKey]);
              }
            });
          }
          this.showCharts = true;
          this.cdr.detectChanges();
          this.saveChartData();
          if (this.hasViewInitialized) {
            this.renderChart(this.data);
          }
        } else {
          console.warn('No data available for chart rendering.');
        }
      },
      error: (err:any) => console.error('Error fetching chart data:', err),
    });
  }

  saveChartData(): void {
    const newAxisData = {
      uniqueIddata: this.uniqueId,
      xaxis: this.xaxis,
      yaxis: this.yaxis,
    };

    this.chartDataService.setAllAxisData(newAxisData);
    console.log('BarChart saved data:', newAxisData);
  }

  emit(): void {
    this.customChartEvent.emit({
      label: this.label,
      uniqueId: this.uniqueId,
      xAxis: this.xKey,
      yAxis: this.yKey,
      aggregationType: this.aggregationType,
      aggregationFieldKey: this.aggregationFieldKey,
      selectchartfunction: true,
      data: this.data,
    });
  }

  toggleChartOrientation(): void {
    this.isHorizontal = !this.isHorizontal;
    [this.xKey, this.yKey] = [this.yKey, this.xKey];
    [this.Bar_x_Axis, this.Bar_y_Axis] = [this.Bar_y_Axis, this.Bar_x_Axis];
    if (this.data?.length) {
      this.renderChart(this.data);
    }
    this.editClicked.emit({
      label: this.label,
      aggregationType: this.aggregationType,
      uniqueIddata: this.uniqueId,
      aggregationFieldKey: this.aggregationFieldKey,
      Bar_x_Axis: this.xKey,
      Bar_y_Axis: this.yKey,
      selectchartfunction: true,
    });
  }

  getaxisdata(): void {
    const alldata = this.chartDataService.getAllAxisData();
    console.log('alldata from service:', alldata);
    const alldataArray = Array.isArray(alldata) ? alldata : Object.values(alldata || {});

    this.allaxisdata = alldataArray.find(item => item?.uniqueIddata === this.uniqueId) || {};
    console.log('allaxisdata:', this.allaxisdata);
  }

  handleClick(event: MouseEvent): void {
    const allData = this.chartDataService.getAllAxisData();
    console.log('All data on click:', allData);

    this.getaxisdata();

    const foundData = Array.isArray(allData) 
      ? allData.find(n => n?.uniqueIddata === this.uniqueId)
      : Object.values(allData || {}).find((n:any) => n?.uniqueIddata === this.uniqueId);

    if (!foundData) {
      console.warn(`No data found for uniqueId: ${this.uniqueId}`);
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('.delete-button') || target.closest('.example-handle')) {
      return;
    }

    this.editClicked.emit({
      label: this.label,
      aggregationType: this.aggregationType,
      Bar_x_Axis: foundData.xaxis ?? '',
      Bar_y_Axis: foundData.yaxis ?? '',
      uniqueIddata: foundData.uniqueIddata,
      selectchartfunction: true,
      aggregationFieldKey: this.aggregationFieldKey,
    });
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
  }

  onDeleteFromChild(): void {
    this.label = 'Bar';
    this.Bar_x_Axis = '';
    this.Bar_y_Axis = '';
    this.xKey = '';
    this.yKey = '';
    this.data = [];
    this.highlightSet.clear();
    this.showCharts = false;
    if (this.hasViewInitialized) {
      this.renderChart([]);
    }
    this.closeChart();
  }

  closeChart(): void {
    this.showCharts = false;
    this.closed.emit();
  }

  initResize(event: MouseEvent): void {
    this.isResizing = true;
    const box = (event.target as HTMLElement).closest('.example-box') as HTMLElement;
    if (!box) return;

    this.startWidth = box.offsetWidth;
    this.startHeight = box.offsetHeight;
    this.startX = event.clientX;
    this.startY = event.clientY;

    const mouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      const width = Math.max(300, this.startWidth + (e.clientX - this.startX));
      const height = Math.max(300, this.startHeight + (e.clientY - this.startY));
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      this.renderChart(this.data);
    };

    const mouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    };

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  }

  renderChart(data: any[]): void {
    if (!this.chartContainer?.nativeElement) return;

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();

    const margin = { top: 40, right: 20, bottom: 100, left: 60 };
    const containerRect = element.getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;

    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = this.createTooltip(element);

    if (!this.xKey || !this.yKey || !data.length) {
      svg
        .append('text')
        .text('No valid data or axes selected.')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px');
      return;
    }

    data.sort((a, b) => (+b[this.yKey] || 0) - (+a[this.yKey] || 0));

    const x = d3.scaleBand()
      .domain(data.map(d => String(d[this.xKey] ?? '')))
      .range([0, width])
      .padding(0.2);

    const yMax = d3.max(data, (d: any) => +d[this.yKey]) || 200;
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height, 0]);

    svg
      .append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
      .selectAll('.tick line')
      .attr('stroke', '#E0E0E0')
      .attr('stroke-opacity', 0.7);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0))
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
      .text(this.xaxis1 || 'X-Axis')
      .style('font-size', '14px');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 20)
      .text(this.yaxis1 || 'Y-Axis')
      .style('font-size', '14px');

    const bars = svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => x(String(d[this.xKey] ?? '')) ?? 0)
      .attr('width', x.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .style('fill', (d: any) => (this.highlightSet.has(d[this.xKey]) ? this.highlightColor : `url(#gradient-${String(d[this.xKey] ?? '')})`))
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent, d: any) => {
        const [mx, my] = d3.pointer(event, element);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${this.xKey}:</strong> ${d[this.xKey] ?? 'N/A'}<br><strong>${this.yKey}:</strong> ${d[this.yKey] ?? 'N/A'}`)
          .style('left', `${mx + 20}px`)
          .style('top', `${my}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event: MouseEvent, d: any) => this.showSwalTable(d));

    const defs = svg.append('defs');
    bars.each((d: any) => {
      const id = String(d[this.xKey] ?? '').replace(/[^a-zA-Z0-9]/g, '_');
      defs
        .append('linearGradient')
        .attr('id', `gradient-${id}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%')
        .selectAll('stop')
        .data([
          { offset: '0%', color: this.normalColorStart },
          { offset: '100%', color: this.normalColorEnd },
        ])
        .enter()
        .append('stop')
        .attr('offset', (d: { offset: string; color: string }) => d.offset)
        .attr('style', (d: { offset: string; color: string }) => `stop-color:${d.color};stop-opacity:1`);
    });

    bars
      .transition()
      .duration(this.animationDuration)
      .attr('y', (d: any) => y(+d[this.yKey] || 0))
      .attr('height', (d: any) => height - y(+d[this.yKey] || 0));

    const labels = svg
      .selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .text((d: any) => d[this.yKey] ?? '')
      .attr('x', (d: any) => (x(String(d[this.xKey] ?? '')) ?? 0) + x.bandwidth() / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('opacity', 0);

    labels
      .transition()
      .duration(this.animationDuration)
      .attr('y', (d: any) => y(+d[this.yKey] || 0) - 5)
      .style('opacity', 1);

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(this.title || 'Chart Title');
  }

  showSwalTable(d: any): void {
    if (!d || !this.xKey) return;

    const fullData = this.data.filter(row => row[this.xKey] === d[this.xKey]);
    const uniqueValues = [...new Set(fullData.map(row => row[this.xKey] ?? ''))];
    const formattedData = {
      [this.xKey]: uniqueValues,
    };
    
    this.chartDataService.Onpostrelationdata(formattedData);
    Swal.fire({
      title: 'Bar Clicked',
      html: `<b>${this.xKey}:</b> ${d[this.xKey] ?? 'N/A'}<br><b>${this.yKey}:</b> ${d[this.yKey] ?? 'N/A'}`,
      icon: 'info',
    });
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
      .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)')
      .style('z-index', '1000');
  }
}