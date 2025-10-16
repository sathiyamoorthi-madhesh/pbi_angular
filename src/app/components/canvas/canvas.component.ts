import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CoreService, TabData } from '../../services/core.service';
import *as d3 from 'd3';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BarChartComponent } from '../all chart/bar-chart/bar-chart.component';
import { LineChartComponent } from '../all chart/line-chart/line-chart.component';
import { PieChartComponent } from '../all chart/pie-chart/pie-chart.component';
import { DonutComponent } from '../all chart/donut/donut.component';
import { AreaChartComponent } from '../all chart/area-chart/area-chart.component';
import { TableComponent } from '../all chart/table/table.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
// import { CardComponent } from '../all chart/card/card.component';
import { StackedcolumnComponent } from '../all chart/stackedcolumn/stackedcolumn.component';
import { StackedbarComponent } from '../all chart/stackedbar/stackedbar.component';
import { ClusteredcolumnComponent } from '../all chart/clusteredcolumn/clusteredcolumn.component';
import { ClusteredbarComponent } from '../all chart/clusteredbar/clusteredbar.component';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { timeout } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatAccordion } from "@angular/material/expansion";
import { MaterialImportsModule } from "../../material.imports";
import { Subscription } from 'rxjs';
import { CardComponent } from '../ui-components/card/card.component';
import { DropdownComponent, DropdownOption, DropdownSelection } from '../ui-components/dropdown/dropdown.component';

enum ChartMode {
  CustomField = 'CustomField',
}
interface LabelGroup {
  label: string;
  idname: number[];
}

interface TitleGroup {
  title: string;
  Ondata: LabelGroup[];
}
interface CollectedItem {
  name: any;
  age: any[];
  // add other fields your API returns
}

interface Tab {
  id: number;
  title: string;
  active: boolean;
  buttons: { name: string }[];
  label?: string;
}
interface ChartEntry {
  title: string;
  data: any[]; // Array of chartDatas
}


@Component({
  selector: 'app-canvas',
  imports: [
    CommonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    ClusteredbarComponent,
    MatSelectModule,
    MatTableModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatPaginatorModule,
    DragDropModule,
    BarChartComponent,
    LineChartComponent,
    PieChartComponent,
    ClusteredcolumnComponent,
    StackedbarComponent,
    DonutComponent,
    AreaChartComponent,
    TableComponent,
    StackedcolumnComponent,
    MaterialImportsModule,
    DropdownComponent
  ],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss'
})
export class CanvasComponent implements OnInit {

  datasource = new MatTableDataSource<any>();
  columnNames: string[] = [];
  displayedColumns: string[] = [];
  totalItems = 0;
  pageSize = 5;
  isNarrow = false;
  currentPage = 0;
  showColumnSelector = true;
  showColumnSelector1 = true;
  chartFieldValues: { [key: string]: string | string[] } = {};
  getlodingdata?: boolean;
  ChartMode = ChartMode;
  selectedMode = ChartMode.CustomField;
  dataloadfunction = false;
  datagetbutton = true;
  tableData: any[] = [];
  customFieldX = '';
  customFieldY = '';
  legendField = '';
  selectedAggregation = '';
  aggregationMethods: string[] = [];
  selectchartfunction?: boolean;
  selectedIndexes = new Set<number>();
  chartTypes: string[] = [];
  activeCharts: { [key: string]: boolean } = {};
  selectedChartType = '';
  chartData: any[] = [];
  data: any;
  xAxis: any;
  legendAxis: any;
  selectedChart: any = '';
  showCharts = true;
  selectFieldtype: any[] = [];
  xValues: any[] = [];
  yValues: any[] = [];
  legendValues: any[] = [];
  collections: { [collection: string]: string[] } = {};
  collectionNames: string[] = [];
  collectionExpanded: { [key: string]: boolean } = {};
  labeltype: any;
  selectedChartLabel: string | null = null;
  chartPayload: any;
  rawData: any[] = [];
  lastFieldKey: string = '';
  col: any;
  field: any;
  Object: any;
  itchartmode?: boolean;
  chart: any;
  visibleFieldList: string[] = [];
  columnVisibility: { [field: string]: boolean } = {};
  allAggregationMethods: string[] = ['Count', 'Count Distinct', 'Sum', 'Average', 'Min', 'Max'];
  fieldList: { label: string; value: string }[] = [];
  private chartDataArray: ChartEntry[] = [];
  selectedfilter: any;
  Oncollecteddata: CollectedItem[] = [];
  sidePanel1?: boolean;
  sidePanel2?: boolean;
  OnshowField: boolean = false;
  chartNames: string[] = [];
  OnRelationshipfield: any[] = [];
  workspacefile: any;
  workspacefile1: any;
  fieldDropListIds: string[] = [];
  dropdownListIds: string[] = [];
  limit = 2000;
  skip = 0;
  aggregatecheck?: boolean;
  Onarraydata?: [];
  labeldata: any;
  selectedFieldss: any;
  uniqueData: any[] = [];
  allFields: any;
  OnFilterdata: any;
  Ondata: any;
  allarraydata?: any;
  selectedUniqueValue: any = null;
  appSide1Visible = true;
  appSide2Visible = true;

  tabs: Tab[] = [];
  currentTabId: number | null = null;
  newTabName = '';
  tabNameInput = '';
  tabCounter = 1;
  nextTabId = 4;
  tabLabels: string[] = [];
  title = '';
  selectedTitle = '';
  selectedTitles = '';
  findlastTab: any;
  dataname: string = '';
  isUpdateMode: boolean = false;
  savaprojecttochaeck: boolean = false;
  totaldata: any[] = [];
  newArr: string[] = [];
  uniqueIddata: any[] = [];
  chartCounter = 0;
  uniquedataid: any;
  Onuniquedatas: any[] = [];
  OntabButton: boolean = false;
  private subscriptions: Subscription = new Subscription();
  activedata: any
  Onid: any
  circumference = 2 * Math.PI * 52; // r = 52
  Onfilterapply?: boolean;
  loadingOverlay = false;
  loadingProgress = 0; // percentage value 0–100
  Oncountdata?: number;
  count = 0;
  sidePanel1Collapsed = false;
  sidePanel2Collapsed = false;

  // Dropdown options
  fieldDropdownOptions: { [key: string]: DropdownOption[] } = {};
  aggregationDropdownOptions: DropdownOption[] = [];

  fieldChanges: { title: string, label: { [key: string]: any }[] }[] = [];
  constructor(private coreservice: CoreService, private snackBar: MatSnackBar, private router: Router) { }
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  get currentTab(): Tab | null {
    return this.tabs.find(tab => tab.id === this.currentTabId) || null;
  }

  Onshowbutton() {
    if (!this.OnshowField) {
      this.OnshowField = true;
    }
    else if (this.OnshowField) {
      this.OnshowField = false;
    }
  }

  dropField(event: CdkDragDrop<string[]>, collection: string): void {
    moveItemInArray(this.collections[collection], event.previousIndex, event.currentIndex);
  }

  //chart icon and field select limit function
  chartIcons = [
    { label: 'Bar', icon: 'bar_chart', fields: ['Bar_x_Axis', 'Bar_y_Axis'], aggregates: true },
    { label: 'Line', icon: 'show_chart', fields: ['Line_x_Axis', 'Line_y_Axis'], aggregates: true },
    { label: 'Area', icon: 'area_chart', fields: ['Area_x_Axis', 'Area_y_Axis'], aggregates: true },
    { label: 'Table', icon: 'table_rows', fields: ['Table_columns'], aggregates: true },
    { label: 'Pie', icon: 'pie_chart', fields: ['Pie_legend', 'Pie_value'], aggregates: true },
    { label: 'Donut', icon: 'donut_large', fields: ['Donut_legend', 'Donut_value'], aggregates: true },
    { label: 'StackedColumn', icon: 'analytics', fields: ['StackedColumn_x_Axis', 'StackedColumn_y_Axis', 'StackedColumn_legend'], aggregates: true },
    { label: 'Stackedbar', icon: 'stacked_bar_chart', fields: ['Stackedbar_y_Axis', 'Stackedbar_x_Axis', 'Stackedbar_legend'], aggregates: true },
    { label: 'clusteredcolumn', icon: 'bar_chart', fields: ['clusteredcolumn_x_Axis', 'clusteredcolumn_y_Axis', 'clusteredcolumn_legend'], aggregates: true },
    { label: 'clusteredbar', icon: 'insert_chart', fields: ['clusteredbar_y_Axis', 'clusteredbar_x_Axis', 'clusteredbar_legend'], aggregates: true },
    { label: "Filter", icon: 'filter_alt', fields: [], aggregates: false }
  ];

  fieldSelectionLimits: { [key: string]: number } = {
    'Bar_x_Axis': 1,
    'Bar_y_Axis': 1,
    'Line_x_Axis': 1,
    'Line_y_Axis': 1,
    'Area_x_Axis': 1,
    'Area_y_Axis': 1,
    'Pie_legend': 1,
    'Pie_value': 1,
    'Donut_legend': 1,
    'Donut_Value': 1,
    'StackedColumn_y_Axis': 1,
    'StackedColumn_legend': 1,
    'Stackedbar_x_Axis': 1,
    'Stackedbar_legend': 1,
    'clusteredcolumn_y_Axis': 1,
    'clusteredcolumn_legend': 1,
    'clusteredbar_x_Axis': 1,
    'clusteredbar_legend': 1
  };



  ngOnInit(): void {
    // Load initial paged data
    this.circumference = 2 * Math.PI * 52;
    this.loadData(this.currentPage, this.pageSize);

    // Subscribe to chart payload updates
    this.subscriptions.add(
      this.coreservice.chartPayload$.subscribe(payload => {
        this.chartPayload = payload;

        for (const collection of this.collectionNames) {
          this.collectionExpanded[collection] = false;

          for (const field of this.collections[collection]) {
            this.columnVisibility[field] = false;
          }
        }
      })
    );


    // Ensure at least one tab exists
    if (this.tabs.length <= 0) {
      this.addTab();
    }

    // Call other initialization functions
    this.projectData();
    this.Onworkspacefile();
    this.Onrelationdata(); // subscribes to relation data
  }
  // // Clean up subscriptions to avoid memory leaks
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTabChange(event: MatTabChangeEvent) {
    console.log('------------------', event.tab.textLabel);
  }

  toggleSidePanel1() {
    this.sidePanel1Collapsed = !this.sidePanel1Collapsed;
  }

  toggleSidePanel2() {
    this.sidePanel2Collapsed = !this.sidePanel2Collapsed;
  }


  // Function to handle relation data
  Onrelationdata(): void {

    this.subscriptions.add(
      this.coreservice.OnrelationData$.subscribe(data => {
        if (data && data.length > 0) {
          console.log('Auto-updated data:', data);

          this.activedata = data;


          // Call selectTab only if Onid is set
          if (this.Onfilterapply) {
            if (this.Onid) {
              this.Onchartactive(this.Onid);
            }
          }
          else {
            if (this.Onid) {
              this.selectTab1(this.Onid);
            }
          }
        } else {
          console.log('No valid data received yet.');
        }
      })
    );
  }

  //===========================================Interaction function fetch data========================================================

  selectTab1(id: number): void {
    this.Onid = id;
    console.log('------------------------------og pk--------------------------------------');
    // Save active tab's selected labels before switching
    const currentTab = this.tabs.find(tab => tab.active);
    if (currentTab) {
      const activeLabels = Object.keys(this.activeCharts).filter(
        key => this.activeCharts[key]
      );
      currentTab.label = activeLabels.join(', ');
      this.selectedTitles = currentTab.title;
    }

    // Reset all tabs and active charts
    this.tabs.forEach(tab => (tab.active = false));
    for (const key in this.activeCharts) {
      if (Object.prototype.hasOwnProperty.call(this.activeCharts, key)) {
        this.activeCharts[key] = false;
      }
    }
    this.findlastTab = this.tabs.length;

    // Find the tab the user selected
    const selected = this.tabs.find(tab => tab.id === id);
    if (!selected) return;

    selected.active = true;
    this.currentTabId = id;
    this.selectchartfunction = false;
    this.selectedTitle = selected.title;
    this.selectedTitles = selected.title;
    this.getChartDataByTitle(selected.title);

    // Restore charts if tab has stored data
    const storedChartDataArray = this.getStoredChartData(this.selectedTitles) || [];

    if (storedChartDataArray.length > 0) {
      this.Oncountdata = storedChartDataArray.length;
      this.count = 0; // reset before loading
      // this.loadingOverlay = true;  // show overlay

      selected.label = storedChartDataArray.map(c => c.label).join(', ');

      for (const chartData of storedChartDataArray) {
        const { uniqueId, label } = chartData;

        if (!this.chartTypes.includes(label)) {
          this.chartTypes.push(label);
        }
        this.activeCharts[label] = true;

        if (!this.selectedChart) {
          this.selectedChart = this.chartIcons.find(c => c.label === label);
          this.selectedTitle = `${selected.title} - ${label} Chart`;
        }

        this.selectchartfunction = true;

        // Restore chart by uniqueId
        this.fetchChartDataByUniqueId1(uniqueId, label, this.selectedTitles, chartData);
      }
    } else {
      this.selectedTitle = selected.title;
    }

  }

  // Example helper function
  fetchChartDataByUniqueId1(uniqueId: string, label: string, title: string, chartData: any) {
    // You can now use uniqueId to fetch/restore chart data
    // Example: calling backend or using local cache
    this.fetchChartDatass1(label, title, chartData);

  }
  fetchChartDatass1(label: string, title: string, _chartData: any, limit = this.limit, skip = this.skip): void {
    this.datagetbutton = false;

    if (!_chartData) {
      this.onChartIconClick(label);
      return;
    }

    const filterChartKeys = (data: Record<string, any>, chartType: string): Record<string, any> => {
      const prefix = `${chartType}_`;
      const result: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith(prefix)) result[key] = data[key];
      });
      return result;
    };

    const groupChartFieldsByTypes = (data: Record<string, any>, chartTypes: string[]): Record<string, Record<string, any>> => {
      const result: Record<string, Record<string, any>> = {};
      chartTypes.forEach(type => {
        const filtered = filterChartKeys(data, type);
        if (Object.keys(filtered).length) result[type] = filtered;
      });
      return result;
    };

    const extractFlatValues = (data: Record<string, any>): string[] => {
      const result: string[] = [];
      Object.keys(data).forEach(key => {
        if (key === 'label' || key === 'title') return;
        const value = data[key];
        if (Array.isArray(value)) result.push(...value);
        else if (typeof value === 'string') result.push(value);
      });
      return result;
    };

    const chartTypes = [
      'Bar', 'Line', 'Pie', 'Donut', 'Area', 'Table', 'Radar', 'Heatmap', 'Bubble',
      'StackedColumn', 'Stackedbar', 'clusteredcolumn', 'ClusteredBar',
      'Stacked Column', 'Stackedbar', 'Clustered Column', 'clusteredbar'
    ];

    // Extract flat values and group fields
    const flatChartDataValues = extractFlatValues(_chartData);
    const chartFieldsGrouped = groupChartFieldsByTypes(_chartData, chartTypes);

    const chartType = chartTypes.find(type => label.toLowerCase().includes(type.toLowerCase()));
    const flatChartData = chartType ? chartFieldsGrouped[chartType] || {} : {};

    const chartDef = this.chartIcons.find(icon => icon.label === label);
    if (!chartDef) {
      this.datagetbutton = true;
      return;
    }

    const aggregationMethod = this.getValidAggregation(this.selectedAggregation);
    this.getlodingdata = true;

    // Prepare unique data for filtering
    const uniqueData = Array.from(new Set(flatChartDataValues));
    this.newArr = [...(this.newArr || []), ...uniqueData.slice(1)];

    /** ---------------- Use existing filtered data ---------------- **/
    const dataFromService = this.coreservice.Ongetfilterdata() || [];

    this.count++;

    // Update totaldata
    this.totaldata = skip > 0 ? [...this.totaldata, ...dataFromService] : [...dataFromService];

    // Update table and datasource
    this.rawData = this.totaldata;
    this.datasource.data = this.totaldata;
    this.lastFieldKey = flatChartDataValues.join(',');
    this.displayedColumns = this.totaldata.length ? Object.keys(this.totaldata[0]) : [];

    // Prepare chart data object
    const preparedChartData = {
      ..._chartData,
      activedata: this.activedata,
      data: this.totaldata,
      fields: flatChartDataValues.map(f => f.split('.')[0]),
      aggregation: aggregationMethod
    };

    this.coreservice.setChartData(label, preparedChartData);
    this.datagetbutton = true;

    // Update loading progress
    this.loadingProgress = Math.round((this.count / this.Oncountdata!) * 100);
    this.getlodingdata = false;
  }

  //==============================================================================================================================
  onChartIconClick(label: string): void {
    const wasInactive = this.activeCharts[label] === false;

    this.labeltype = label;
    this.selectedChartLabel = label;

    if (!this.chartTypes.includes(label)) {
      this.chartTypes.push(label);
    }

    // Reset values
    this.visibleFieldList = [];
    this.chartFieldValues = {};

    this.selectedChart = this.chartIcons.find(chart => chart.label === label);
    this.activeCharts[label] = true;
    this.selectchartfunction = true;

    this.clearAllSelectedColumns();
    this.selectedAggregation = '';

    // Populate visibleFieldList with all available fields from collections
    this.populateVisibleFieldList();
    
    // Clear existing dropdown options to force regeneration with selected fields only
    this.fieldDropdownOptions = {};

    const activeTab = this.currentTab;
    if (activeTab && !activeTab.label?.includes(label)) {
      activeTab.label = activeTab.label ? `${activeTab.label}, ${label}` : label;
    }

    this.coreservice.setChartData(label, this.showCharts);

    this.addChart({ label, title: this.selectedTitle, idname: ++this.chartCounter });
  }

  isOptionDisabled(field: string, option: string): boolean {
    const rawValue = this.chartFieldValues[field];
    const selectedValues: string[] = Array.isArray(rawValue) ? rawValue : [];

    const limit: number = this.fieldSelectionLimits[field] || Infinity;

    return selectedValues.length >= limit && !selectedValues.includes(option);
  }

  clickmode() {
    this.itchartmode = !this.itchartmode;
  }

  getFieldLabel(field: string): string {
    const parts = field.split('_');
    parts.shift();
    return parts.join(' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  clearAllSelectedColumns(): void {
    for (const collection in this.collections) {
      const fields = this.collections[collection];
      fields.forEach(field => {
        if (this.columnVisibility[field]) {
          this.columnVisibility[field] = false;
          this.toggleColumn(field, false);
        }
      });
    }
  }

  populateVisibleFieldList(): void {
    this.visibleFieldList = [];
    for (const collection in this.collections) {
      const fields = this.collections[collection];
      fields.forEach(field => {
        if (!this.visibleFieldList.includes(field)) {
          this.visibleFieldList.push(field);
        }
      });
    }
  }

  getSelectedFieldsList(): string[] {
    return Object.keys(this.columnVisibility).filter(field => this.columnVisibility[field]);
  }

  // Auto-check a field in the Fields panel when dropped on a dropdown
  onFieldDroppedFromDropdown(rawField: string) {
    if (!rawField) return;

    // Ensure the field exists in any collection, and mark visible/checked
    const existsInCollections = Object.keys(this.collections).some(coll =>
      this.collections[coll]?.includes(rawField)
    );

    if (!existsInCollections) {
      return;
    }

    // Check the checkbox and add to visible list if needed
    if (!this.columnVisibility[rawField]) {
      this.columnVisibility[rawField] = true;
      if (!this.visibleFieldList.includes(rawField)) {
        this.visibleFieldList.push(rawField);
      }
      this.updateDisplayedColumns();
    }

    // Clear dropdown options so they refresh with newly selected fields
    this.fieldDropdownOptions = {};
  }

  toggleNarrowMode() {
    this.isNarrow = !this.isNarrow;
  }

  // workspace function
  Onworkspacefile() {
    this.coreservice.getDatas().subscribe(data => {
      if (data !== null) {
        this.workspacefile = data.name;
        this.workspacefile1 = data.OnFoldername;
        if (this.selectedChart === null) {
          this.selectedChart = this.workspacefile;
        }
      }
    });
    this.onChartSelect()
  }

  backtoworkspace() {
    this.coreservice.workspacefile1 = this.workspacefile1;
    this.router.navigate(['/workspace']);
    this.button();
  }

  button() {
    const formattedData = '';
    this.coreservice.Onpostrelationdata(formattedData);
  }

  projectData() {
    this.coreservice.getDatanames().subscribe(
      (res: string[]) => {
        this.chartNames = res;
      },
      (error) => {
        console.error('Error fetching chart names:', error);
      }
    )
  }

  handleChartEdit(event: {
    label: string;
    uniqueIddata: any;
    aggregationType?: string;
    aggregationFieldKey?: string;
    aggregationFields?: any;
    selectchartfunction?: boolean;
    [key: string]: any;
  }): void {
    const {
      label,
      uniqueIddata,
      aggregationType,
      aggregationFieldKey,
      aggregationFields,
      selectchartfunction,
      ...rest
    } = event;

    // Common assignments
    this.labeltype = label;
    this.uniquedataid = uniqueIddata;
    this.selectedChartLabel = label;

    const chart = this.chartIcons.find(c => c.label === label);
    if (!chart) {
      return;
    }

    this.selectedChart = chart;
    this.activeCharts[label] = this.activeCharts[label] ?? true;

    // Handle selectchartfunction if chart is active
    if (this.activeCharts[label] === true && selectchartfunction !== undefined) {
      this.selectchartfunction = selectchartfunction;
    }

    // Update other chart properties if provided
    Object.entries(rest).forEach(([key, value]) => {
      (chart as any)[key] = value;
    });

    // Handle aggregation if provided
    if (aggregationType) {
      this.selectedAggregation = aggregationType;
    }


    this.chartFieldValues = {};
    const combinedValues: any[] = [];

    const chartFields = this.selectedChart?.fields || [];
    chartFields.forEach((fieldKey: string) => {
      const value = event[fieldKey] || event[`${fieldKey}.Dataset`] || [];
      this.chartFieldValues[fieldKey] = value;

      if (Array.isArray(value)) {
        combinedValues.push(...value);
      }

    });

    this.autoSelectFieldsFromChart(combinedValues);
    this.Onlabelcheck(this.labeltype);
    this.chartIcons = [...this.chartIcons];
  }

  Onlabelcheck(label: any) {
    this.labeltype = label;
    this.selectedChartLabel = label;
    this.selectchartfunction = true;

    const labels = this.uniqueIddata.flatMap(page =>
      page.Ondata.map((item: any) => item.label)
    );

    this.activeCharts[label] = labels.includes(label);

    const activeLabels = Object.keys(this.activeCharts).filter(
      key => this.activeCharts[key]
    );
  }

  shouldShowRed(label: any): boolean {
    return this.selectedChartLabel === label && this.selectchartfunction!;
  }

  autoSelectFieldsFromChart(fields: string[]): void {

    this.visibleFieldList = [];
    this.columnVisibility = {};

    Object.keys(this.collectionExpanded).forEach(coll => {
      this.collectionExpanded[coll] = false;
    });

    const selectedPairs: { collection: string; field: string }[] = [];

    fields.forEach((fieldWithCollection: string) => {
      const collectionName = Object.keys(this.collections).find(coll =>
        this.collections[coll].includes(fieldWithCollection)
      );

      if (collectionName) {
        this.collectionExpanded[collectionName] = true;
        this.columnVisibility[fieldWithCollection] = true;

        if (!this.visibleFieldList.includes(fieldWithCollection)) {
          this.visibleFieldList.push(fieldWithCollection);
        }

        const [fieldName] = fieldWithCollection.split('.');
        selectedPairs.push({ collection: collectionName, field: fieldName });
      }
    });

    if (selectedPairs.length > 0) {
      selectedPairs.forEach(({ collection, field }) => {
      });
    }
  }

  click() {
    this.selectchartfunction = false;
  }

  // Dropdown management methods (simplified for component usage)

  // Prepare dropdown options
  prepareFieldDropdownOptions(field: string): DropdownOption[] {
    if (!this.fieldDropdownOptions[field]) {
      // Use only selected fields instead of all visible fields
      const selectedFields = this.getSelectedFieldsList();
      this.fieldDropdownOptions[field] = selectedFields.map(fieldName => ({
        value: fieldName,
        label: fieldName,
        disabled: false
      }));
    }
    return this.fieldDropdownOptions[field];
  }

  prepareAggregationDropdownOptions(): DropdownOption[] {
    if (this.aggregationDropdownOptions.length === 0) {
      this.aggregationDropdownOptions = this.allAggregationMethods.map(agg => ({
        value: agg,
        label: agg,
        disabled: false
      }));
    }
    return this.aggregationDropdownOptions;
  }

  // Handle dropdown selection changes
  onFieldDropdownChange(event: DropdownSelection): void {
    const { field, values } = event;
    this.chartFieldValues[field] = values as any;
    this.onFieldChange(field);
  
    // Sync field panel: mark used fields as checked
    const used = new Set<string>();
    Object.values(this.chartFieldValues).forEach(val => {
      if (Array.isArray(val)) val.forEach(v => used.add(v));
      else if (typeof val === 'string' && val) used.add(val);
    });
  
    Object.keys(this.columnVisibility).forEach(f => {
      if (used.has(f)) this.columnVisibility[f] = true;
    });
  
    this.updateDisplayedColumns();
  }

  onAggregationDropdownChange(event: DropdownSelection): void {
    const { values } = event;
    this.selectedAggregation = values[0];
  }

  // Get field selection limit
  getFieldSelectionLimit(field: string): number {
    return this.fieldSelectionLimits[field] || Infinity;
  }

  // Get field selected values as array
  getFieldSelectedValues(field: string): any[] {
    const values = this.chartFieldValues[field];
    if (!values) return [];
    return Array.isArray(values) ? values : [values];
  }

  getSelectedFields(): string[] {
    return Object.keys(this.columnVisibility).filter(key => this.columnVisibility[key]);
  }

  deleteChartEdits(event: { label: any; selectchartfunction: boolean }): void {
    const { label, selectchartfunction } = event;
    this.activeCharts[label] = false;
    this.selectchartfunction = selectchartfunction;
  }

  loadData(pageIndex: number, pageSize: number): void {
    this.coreservice.getCollectionFields().subscribe({
      next: (response) => {
        this.collections = response.collections || {};
        this.collectionNames = Object.keys(this.collections);

        this.fieldDropListIds = this.collectionNames.map(name => `fieldsList_${name}`)
        // Create matching dropdown ids per chart field role (x/y/legend/etc.) to allow mutual connections
        // We generate a stable small set; each dropdown instance will pick one by index in template
        this.dropdownListIds = ['dropdown_x', 'dropdown_y', 'dropdown_value', 'dropdown_legend', 'dropdown_extra'];

        let sampleData = response.data;

        // filter out items where label === 'Filter'
        if (Array.isArray(sampleData)) {
          sampleData = sampleData.filter(item => item.label !== 'Filter');
        }

        if (this.columnNames.length === 0 && Array.isArray(sampleData) && sampleData.length > 0) {
          this.columnNames = Object.keys(sampleData[0]);

          this.columnNames.forEach(col => {
            this.columnVisibility[col] = false;
          });

          this.fieldList = this.columnNames.map(col => ({ label: col, value: col }));

          this.updateDisplayedColumns();
        } else {
          this.datasource.data = [];
        }
      },
      error: (error) => {
        console.error('Error fetching fields:', error);
      }
    });
  }

  onFieldChange(field: string): void {
    const value = this.chartFieldValues[field];

    const limit = this.fieldSelectionLimits[field] || Infinity;
    if (this.chartFieldValues[field]?.length > limit) {
      this.chartFieldValues[field] = this.chartFieldValues[field].slice(0, limit);
    }

    // Update aggregation if needed
    const yFields = ['y', 'y1', 'y2', 'value', 'target', 'trend'];
    if (yFields.includes(field)) {
      this.updateAggregationMethods();
    }

    // Call function to log field change
    this.handleFieldChange(field, value, this.labeltype, this.title);
  }

  handleFieldChange(field: string, value: any, labeltype: string, title: string): void {
    const existingRecord = this.fieldChanges.find(item => item.title === title);

    const newLabelEntry = {
      [labeltype]: {
        [field]: value
      }
    };

    if (existingRecord) {
      existingRecord.label.push(newLabelEntry);
    } else {
      const newRecord = {
        title: title,
        label: [newLabelEntry]
      };
      this.fieldChanges.push(newRecord);
    }
  }

  toggleCollectionVisibility(collection: string) {
    this.collectionExpanded[collection] = !this.collectionExpanded[collection];
  }

  updateDisplayedColumns() {
    this.displayedColumns = Object.keys(this.columnVisibility)
      .filter(field => this.columnVisibility[field]);
  }

  initializeColumnVisibility(): void {
    this.columnNames.forEach(col => this.columnVisibility[col] = true);
    this.updateDisplayedColumns();
  }

  toggleColumnSelector(): void {
    this.showColumnSelector = !this.showColumnSelector;
    this.showColumnSelector1 = !this.showColumnSelector1;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData(this.currentPage, this.pageSize);
  }

  drop(event: any): void {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const movedItem = this.columnNames.splice(previousIndex, 1)[0];
    this.columnNames.splice(currentIndex, 0, movedItem);
  }

  shouldShowPaginator(): boolean {
    const visibleColumns = Object.values(this.columnVisibility).filter(v => v).length;
    return visibleColumns > 0 && this.datasource.data.length > 0;
  }

  updateAggregationMethods(): void {
    const yKeys = ['y', 'y1', 'y2', 'value', 'target', 'trend'];

    const yField = yKeys.find(key => this.chartFieldValues[key]);

    if (!yField || !this.datasource?.data?.length) {
      this.aggregationMethods = [];
      return;
    }

    let yFieldName = this.chartFieldValues[yField] as any;
    if(Array.isArray(yFieldName)) {
      yFieldName = yFieldName[0] || '';
    }

    if(!yFieldName) {
      this.aggregationMethods = [];
      return;
    }

    const sample = this.datasource.data.find(d => d[yFieldName] !== undefined);
    const value = sample?.[yFieldName];

    const isNumeric = typeof value === 'number' || (!isNaN(value) && value !== null && value !== '');

    this.aggregationMethods = isNumeric
      ? [...this.allAggregationMethods]
      : ['Count', 'Count Distinct'];

    if (!this.aggregationMethods.includes(this.selectedAggregation)) {
      this.selectedAggregation = this.aggregationMethods[0];
    }
  }

  toggleAllColumns(checked: boolean): void {
    for (const field of Object.keys(this.columnVisibility)) {
      this.columnVisibility[field] = checked;
    }
    this.updateDisplayedColumns();
  }

  allColumnsSelected(): boolean {
    const fields = Object.keys(this.columnVisibility);
    return fields.length > 0 && fields.every(field => this.columnVisibility[field]);
  }

  toggleColumn(field: string, checked: boolean): void {
    const collectionName = Object.keys(this.collections).find(coll =>
      this.collections[coll].includes(field)
    );

    if (!collectionName) {
      return;
    }

    const collectionField = `${field}`;
    this.columnVisibility[field] = checked;

    if (checked) {
      if (!this.visibleFieldList.includes(collectionField)) {
        this.visibleFieldList.push(collectionField);
      }
    } else {
      this.visibleFieldList = this.visibleFieldList.filter(f => f !== collectionField);
      this.removeFieldFromAllRoles(field);
    }

    // Clear dropdown options cache to refresh with new field selection
    this.fieldDropdownOptions = {};
    this.updateDisplayedColumns();
  }

  private removeFieldFromAllRoles(fieldName: string): void {
    const roles = Object.keys(this.chartFieldValues || {});
    for (const role of roles) {
      const val = this.chartFieldValues[role];
      if (Array.isArray(val)) {
        const next = val.filter(v => v !== fieldName);
        if (next.length !== val.length) {
          this.chartFieldValues[role] = next;
          this.onFieldChange(role);
        }
      } else if (typeof val === 'string' && val === fieldName) {
        // Clear single-select role if it was the removed field
        this.chartFieldValues[role] = Array.isArray(val) ? [] : '';
        this.onFieldChange(role);
      }
    }
  }

  private isFieldUsedAnywhere(fieldName: string): boolean {
    const roles = Object.keys(this.chartFieldValues || {});
    for (const role of roles) {
      const val = this.chartFieldValues[role];
      if (Array.isArray(val) && val.includes(fieldName)) return true;
      if (typeof val === 'string' && val === fieldName) return true;
    }
    return false;
  }

  someColumnsSelected(): boolean {
    const fields = Object.keys(this.columnVisibility);
    return fields.some(field => this.columnVisibility[field]) && !this.allColumnsSelected();
  }

  getLabelForField(field: string): string {
    return field.charAt(0).toUpperCase() + field.slice(1);
  }

  // fetchChartDatas(): void {
  //   const selectedFields: string[] = Array.isArray(this.chartFieldValues?.['table'])
  //     ? this.chartFieldValues['table'] as string[]
  //     : [];

  //   this.getlodingdata = true;

  //   this.coreservice.getFilteredDatas({}, selectedFields).subscribe({
  //     next: (res) => {
  //       this.rawData = res.data;

  //       this.datasource.data = res.data || [];

  //       this.displayedColumns = Array.isArray(res.data) && res.data.length > 0
  //         ? Object.keys(res.data[0])
  //         : [];

  //       this.datasource.paginator = this.paginator;
  //     },
  //     error: (err) => {
  //       console.error('Error fetching filtered data:', err);
  //     },
  //     complete: () => {
  //       this.getlodingdata = false;
  //     }
  //   });
  // }

  onFirstSelect(selectedField: string, option?: string): void {
    this.selectedFieldss = selectedField;

    const rawValue = this.chartFieldValues[selectedField];
    const selectedValues: string[] = Array.isArray(rawValue) ? rawValue : [];

    const limit: number = this.fieldSelectionLimits[selectedField] || Infinity;

    if (selectedValues.length >= limit && option && !selectedValues.includes(option)) {
      this.showMessage(`You can only select up to ${limit} values.`, "warning");
      return;
    }

    this.labeldata = "Filter";
    this.fetchChartData(this.labeldata);
  }
  
  fetchChartData(label: string): void {
    const chartDef = this.chartIcons.find(icon => icon.label === label);
    if (!chartDef) return;

    this.resetChartFieldData();

    // Show loading overlay and reset progress
    this.loadingOverlay = true;
    this.loadingProgress = 0;
    this.getlodingdata = true;

    const collName = this.collectionNames[0];

    /** 🔹 Build and dedupe fields */
    // Start from newArr
    this.allFields = this.removeDuplicates(this.newArr || []);

    // if (label === 'Filter') {
    //   // For filter → include selected field
    //   this.allFields = this.removeDuplicates([
    //     ...this.allFields,
    //     ...(this.selectedFieldss ? [this.selectedFieldss] : []),
    //   ]);
    // } else {
      // For other charts → include extracted fields
      const extractedFields = this.extractFieldsForQuery(chartDef.fields, collName);
     if(this.allFields){

      this.allFields = [
        ...this.allFields,
        ...extractedFields,
      ];
    }else{
      this.allFields = [...extractedFields]
    }
    console.log('All Fields for Query:', this.allFields);
    // }

    // ✅ At this point, this.allFields is always deduped and logged

    /** 🔹 Aggregation setup */
    const aggregationMethod = this.getValidAggregation(this.selectedAggregation);

    /** 🔹 Simulate progress up to 90% */
    const progressInterval = setInterval(() => {
      if (this.loadingProgress < 90) this.loadingProgress += 5;
    }, 200);

    /** 🔹 Fetch data from API */
    this.coreservice.getFilteredData_Test1({}, this.xValues, this.yValues, this.legendValues[0],aggregationMethod).subscribe({
    // this.coreservice.getFilteredData({}, this.allFields, this.limit, this.skip).subscribe({
      next: (res) => {
        const data = res.data || [];

        // Append or reset total data
        if (this.skip > 0) this.totaldata.push(...data);
        else this.totaldata = [...data];

        this.rawData = data;
        this.datasource.data = data;
        this.lastFieldKey = this.allFields.join(',');
        this.displayedColumns = data.length ? Object.keys(data[0]) : [];

        // Update filter data in service
        this.coreservice.Onpostfilterdata([...data]);

        /** 🔹 Prepare chartData + chartMeta */
        const chartData = {
          data,
          activedata: this.activedata,
          uniqueIddata: this.uniquedataid,
          aggregation: aggregationMethod,
          fields: this.selectFieldtype.map(f => f.split('.')[0]),
          aggregationFields: this.getAggregationFields(aggregationMethod),
        };

        const chartMeta = {
          title: this.selectedTitles,
          uniqueIddata: this.uniquedataid,
          aggregation: aggregationMethod,
          label,
        };

        if (label !== 'Filter') {
          // Assign axis names and store chart meta/data
          this.assignAxisNames(chartMeta, chartDef.fields);
          this.storeChartData(this.selectedTitles, chartMeta);
          this.assignAxisNames(chartData, chartDef.fields);
          this.coreservice.setChartData(label, chartData);
        } else if (this.selectedFieldss) {
          // Compute unique values for filters
          const fieldName = this.selectedFieldss.split('.')[0];
          this.Oncollecteddata = this.coreservice.Ongetfilterdata();
          const instances = this.Oncollecteddata.map((item: any) => item[fieldName]);
          this.uniqueData = [...new Set(instances)];
          this.Ondata = [...new Set(instances)];
        }
        this.datagetbutton = true;
        this.showMessage('Data fetched successfully', 'success');
      },
      error: (err) => {
        console.error('Error fetching chart data:', err);
        this.showMessage('Error fetching data', 'error');
      },
      complete: () => {
        clearInterval(progressInterval);
        this.getlodingdata = false;

        /** 🔹 Animate progress to 100 smoothly */
        const finalProgressInterval = setInterval(() => {
          if (this.loadingProgress < 100) {
            this.loadingProgress += 2;
            if (this.loadingProgress > 100) this.loadingProgress = 100;
          } else {
            clearInterval(finalProgressInterval);
            setTimeout(() => (this.loadingOverlay = false), 500);
          }
        }, 20);
      },
    });
  }


  //============================================================================================================
  // they all workspace function 
  getActiveTabId(): number | null {
    const activeTab = this.tabs.find(tab => tab.active);
    return activeTab ? activeTab.id : null;
  }

  Onselectfilter: any;
  //=========================================the Filter function data fetch function==================================
  onUniqueValueSelected(value: any, id: number | null) {
    this.Onfilterapply = true;
    if (id === null) return;
    this.Onselectfilter = this.selectedFieldss;

    const name_only = this.selectedFieldss.split(".")[0];
    this.Oncollecteddata = this.coreservice.Ongetfilterdata();
    const filteredData = this.Oncollecteddata.filter(
      (item: any) => item[name_only] === value
    );

    this.allarraydata = filteredData;


    this.Onchartactive(id);
  }
  Onchartactive(id: any) {
    // Find currently active tab
    const currentTab = this.tabs.find(tab => tab.active);

    if (currentTab) {
      const activeLabels = Object.keys(this.activeCharts).filter(
        key => this.activeCharts[key]
      );
      currentTab.label = activeLabels.join(', ');
      this.selectedTitles = currentTab.title;
    }

    // Reset all tabs and active charts
    this.tabs.forEach(tab => (tab.active = false));
    for (const key in this.activeCharts) {
      if (Object.prototype.hasOwnProperty.call(this.activeCharts, key)) {
        this.activeCharts[key] = false;
      }
    }

    this.findlastTab = this.tabs.length;

    // Find the tab user selected
    const selected = this.tabs.find(tab => tab.id === id);
    if (!selected) return;

    // Activate selected tab
    selected.active = true;
    this.currentTabId = id;
    this.selectchartfunction = false;
    this.selectedTitle = selected.title;
    this.selectedTitles = selected.title;

    // Fetch chart data for this title
    this.getChartDataByTitle(selected.title);

    // Restore stored chart data if available
    const storedChartDataArray = this.getStoredChartData(this.selectedTitles) || [];

    if (storedChartDataArray.length > 0) {
      this.Oncountdata = storedChartDataArray.length;
      this.count = 0;
      this.loadingProgress = 0;
      // this.loadingOverlay = true;

      selected.label = storedChartDataArray.map(c => c.label).join(', ');

      for (const chartData of storedChartDataArray) {
        const { uniqueId, label } = chartData;

        if (!this.chartTypes.includes(label)) {
          this.chartTypes.push(label);
        }

        this.activeCharts[label] = true;

        if (!this.selectedChart) {
          this.selectedChart = this.chartIcons.find(c => c.label === label);
          this.selectedTitle = `${selected.title} - ${label} Chart`;
        }

        this.selectchartfunction = true;

        this.fetchChartDataByUniqueIds(uniqueId, label, this.selectedTitles, chartData);
      }
    } else {
      this.selectedTitle = selected.title;
    }

  }

  fetchChartDataByUniqueIds(uniqueId: string, label: string, title: string, chartData: any) {
    this.fetchChartDatasss(label, title, chartData);
  }
  fetchChartDatasss(
    label: string,
    title: string,
    _chartData: any,
    limit = this.limit,
    skip = this.skip
  ): void {
    this.datagetbutton = false;

    if (!_chartData) {
      this.onChartIconClick(label);
      return;
    }

    const filterChartKeys = (data: Record<string, any>, chartType: string) => {
      const prefix = `${chartType}_`;
      return Object.fromEntries(
        Object.entries(data).filter(([k]) => k.startsWith(prefix))
      );
    };

    const groupChartFieldsByTypes = (
      data: Record<string, any>,
      chartTypes: string[]
    ) => {
      const result: Record<string, Record<string, any>> = {};
      for (const type of chartTypes) {
        const filtered = filterChartKeys(data, type);
        if (Object.keys(filtered).length > 0) {
          result[type] = filtered;
        }
      }
      return result;
    };

    const extractFlatValues = (data: Record<string, any>): string[] => {
      const result: string[] = [];
      for (const key in data) {
        if (key === 'label' || key === 'title') continue;
        const value = data[key];
        if (Array.isArray(value)) {
          result.push(...value);
        } else if (typeof value === 'string') {
          result.push(value);
        }
      }
      return result;
    };

    const chartTypes = [
      'Bar', 'Line', 'Pie', 'Donut', 'Area', 'Table', 'Radar', 'Heatmap', 'Bubble',
      'StackedColumn', 'Stackedbar', 'ClusteredColumn', 'ClusteredBar'
    ];

    const flatChartDataValues = extractFlatValues(_chartData);
    const chartFieldsGrouped = groupChartFieldsByTypes(_chartData, chartTypes);

    const chartType = chartTypes.find(type =>
      label.toLowerCase().includes(type.toLowerCase())
    );
    const flatChartData = chartType ? chartFieldsGrouped[chartType] || {} : {};

    const chartDef = this.chartIcons.find(icon => icon.label === label);
    if (!chartDef) {
      this.datagetbutton = true;
      return;
    }

    const aggregationMethod = this.getValidAggregation(this.selectedAggregation);
    this.getlodingdata = true;

    // ✅ use allarraydata directly
    const data = this.allarraydata || [];
    this.count++;

    this.totaldata = skip > 0 ? [...this.totaldata, ...data] : [...data];
    this.rawData = this.totaldata;
    this.datasource.data = this.totaldata;

    this.lastFieldKey = flatChartDataValues.join(',');
    this.displayedColumns = this.totaldata.length ? Object.keys(this.totaldata[0]) : [];

    const preparedChartData: any = {
      ..._chartData,
      activedata: this.activedata,
      data: this.totaldata,
      fields: flatChartDataValues.map(f => f.split('.')[0]),
      aggregation: aggregationMethod
    };

    this.coreservice.setChartData(label, preparedChartData);

    this.datagetbutton = true;
    // this.loadingProgress = Math.round((this.count / this.Oncountdata) * 100);

    // if (this.count >= this.Oncountdata) {
    //   this.loadingProgress = 100;
    //   setTimeout(() => {
    //     this.loadingOverlay = false;
    //     console.log('✅ All charts loaded');
    //   }, 500);
    // }

    this.getlodingdata = false;
  }



  removeFilter(): void {
    this.Onfilterapply = false;

    // Restore original full dataset
    this.Oncollecteddata = this.coreservice.Ongetfilterdata();
    this.allarraydata = [...this.Oncollecteddata];

    // Re-load chart data with unfiltered dataset
    if (this.currentTabId) {
      this.Onchartactive(this.currentTabId);
    }
  }


  //==============================================================================================================

  resetChartFieldData(): void {
    this.xValues = [];
    this.yValues = [];
    this.legendValues = [];
    this.selectFieldtype = [];
  }

 extractFieldsForQuery(fieldKeys: string[], collName: string): string[] {
    const allFields: string[] = [];
    const aggregation = this.getValidAggregation(this.selectedAggregation);
    this.selectFieldtype.push(aggregation);
    for (const fieldKey of fieldKeys) {
      const rawVal = this.chartFieldValues[fieldKey];
      if (!rawVal) continue;

      const fields: string[] = Array.isArray(rawVal) ? rawVal : [rawVal];

      for (const field of fields) {
        const fullField = `${field}`;
        allFields.push(fullField);
        this.selectFieldtype.push(fullField);

        if (fieldKey === 'x' || fieldKey === 'Bar_x_Axis' || fieldKey === 'clusteredcolumn_x_Axis') this.xValues.push(fullField);
        if (['y', 'y1', 'y2', 'value', 'target', 'trend', 'Bar_y_Axis', 'clusteredcolumn_y_Axis'].includes(fieldKey)) this.yValues.push(fullField);
        if (fieldKey === 'legend' || fieldKey === 'clusteredcolumn_legend') this.legendValues.push(fullField);
        console.log(fieldKey,fullField,this.xValues,this.yValues,this.legendValues)
      }
    }

    return allFields;
  }

  getValidAggregation(method?: string): string {
    const allowed = ['Count', 'Count Distinct', 'Sum', 'Average', 'Min', 'Max'];
    const trimmed = method?.trim() || 'Count';
    return allowed.includes(trimmed) ? trimmed : 'Count';
  }

  getAggregationFields(method: string): Record<string, string> {
    const aggFields: Record<string, string> = {};
    for (const field of this.yValues) {
      aggFields[field] = method;
    }
    return aggFields;
  }

  assignAxisNames(payload: any, fieldKeys: string[]): void {
    for (const fieldKey of fieldKeys) {
      const roleKey = this.getPayloadKeyName(fieldKey);
      const rawVal = this.chartFieldValues[fieldKey];
      if (!rawVal) continue;


      payload[roleKey] = Array.isArray(rawVal) ? rawVal : rawVal;
    }
  }

  getPayloadKeyName(fieldKey: string): string {
    switch (fieldKey) {
      case 'x': return 'xAxis';
      case 'y': return 'yAxis';
      case 'y1': return 'yAxis1';
      case 'y2': return 'yAxis2';
      case 'legend': return 'legendAxis';
      case 'value': return 'value';
      case 'target': return 'target';
      case 'trend': return 'trend';
      case 'location': return 'location';
      case 'row': return 'row';
      case 'column': return 'column';
      case 'columns': return 'columns';
      case 'stage': return 'stage';
      case 'field': return 'field';
      case 'values': return 'values';
      default: return fieldKey;
    }
  }

  ////////////////////////////////Tabs function to use the code//////////////////////////////

  //===============================the tab function and the stored chart data fetch function============================
  addTab(): void {
    const maxTabs = 50;

    if (this.tabs.length >= maxTabs) {
      alert(`Cannot create more than ${maxTabs} tabs.you can reached maximum of ${maxTabs} tabs.`);
      return;
    }

    // === Prepare tab title ===
    if (this.newTabName.trim()) {
      // Use user-provided name
      this.title = this.newTabName.trim();
    } else {
      // Auto-generate: Find smallest missing Page number
      const usedNumbers = this.tabs
        .map(tab => {
          const match = tab.title.match(/^Page (\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(n => n !== null) as number[];

      let nextNum = 1;
      while (usedNumbers.includes(nextNum)) {
        nextNum++;
      }
      this.title = `Page ${nextNum}`;
    }

    // If somehow the title is still empty, stop here
    if (!this.title) {
      return;
    }

    //  Store empty chart data for this tab 
    const emptyData = {
      title: this.title,
      data: []
    };
    this.chartDataArray.push(emptyData);

    //  Check if a tab with the same title already exists 
    const existingTab = this.tabs.find(
      tab => tab.title.toLowerCase() === this.title.toLowerCase()
    );

    if (existingTab) {
      existingTab.active = true;
      existingTab.buttons = [];
      this.tabs.forEach(tab => tab.active = tab === existingTab);
      this.currentTabId = existingTab.id;
    } else {
      const label = '';
      const newTab: Tab = {
        id: Date.now(),
        title: this.title,
        active: true,
        buttons: [],
        label
      };
      this.tabs.forEach(tab => tab.active = false);
      this.tabs.push(newTab);
      this.tabLabels.push(label);
      this.currentTabId = newTab.id;
      this.selectedTitles = newTab.title;
      this.chartTypes = [];
    }

    // === Reset all charts to inactive ===
    for (const key in this.activeCharts) {
      if (Object.prototype.hasOwnProperty.call(this.activeCharts, key)) {
        this.activeCharts[key] = false;
      }
    }

    // === Reset UI selections ===
    this.getChartDataByTitle(this.title);
    this.selectedTitle = this.title;
    this.selectedChart = null;
    this.selectchartfunction = false;
    this.newTabName = '';
  }

  selectTab(id: number): void {
    this.Onid = id;
    console.log('------------------------------og--------------------------------------');
    this.button();
    // Save active tab's selected labels before switching
    const currentTab = this.tabs.find(tab => tab.active);
    if (currentTab) {
      const activeLabels = Object.keys(this.activeCharts).filter(
        key => this.activeCharts[key]
      );
      currentTab.label = activeLabels.join(', ');
      this.selectedTitles = currentTab.title;
    }

    // Reset all tabs and active charts
    this.tabs.forEach(tab => (tab.active = false));
    for (const key in this.activeCharts) {
      if (Object.prototype.hasOwnProperty.call(this.activeCharts, key)) {
        this.activeCharts[key] = false;
      }
    }
    this.findlastTab = this.tabs.length;

    // Find the tab the user selected
    const selected = this.tabs.find(tab => tab.id === id);
    if (!selected) return;

    selected.active = true;
    this.currentTabId = id;
    this.selectchartfunction = false;
    this.selectedTitle = selected.title;
    this.selectedTitles = selected.title;
    this.getChartDataByTitle(selected.title);

    // Restore charts if tab has stored data
    const storedChartDataArray = this.getStoredChartData(this.selectedTitles) || [];

    // if (storedChartDataArray.length > 0) {
    //   this.Oncountdata = storedChartDataArray.length;
    //   console.log('-----------------storedChartDataArray.length--------------------',storedChartDataArray.length)
    //   console.log('-----------------storedChartDataArray.length--------------------',storedChartDataArray)
    //   selected.label = storedChartDataArray.map(c => c.label).join(', ');

    //   for (const chartData of storedChartDataArray) {
    //     const { uniqueId, label } = chartData;

    //     if (!this.chartTypes.includes(label)) {
    //       this.chartTypes.push(label);
    //     }
    //     this.activeCharts[label] = true;

    //     if (!this.selectedChart) {
    //       this.selectedChart = this.chartIcons.find(c => c.label === label);
    //       this.selectedTitle = `${selected.title} - ${label} Chart`;
    //     }

    //     this.selectchartfunction = true;

    //     // Restore chart by uniqueId
    //     this.fetchChartDataByUniqueId(uniqueId, label, this.selectedTitles, chartData);
    //   }
    // } else {
    //   this.selectedTitle = selected.title;
    // }


    if (storedChartDataArray.length > 0) {
      this.Oncountdata = storedChartDataArray.length;
      this.count = 0; // reset before loading
      this.loadingOverlay = true;  // show overlay

      selected.label = storedChartDataArray.map(c => c.label).join(', ');

      for (const chartData of storedChartDataArray) {
        const { uniqueId, label } = chartData;

        if (!this.chartTypes.includes(label)) {
          this.chartTypes.push(label);
        }
        this.activeCharts[label] = true;

        if (!this.selectedChart) {
          this.selectedChart = this.chartIcons.find(c => c.label === label);
          this.selectedTitle = `${selected.title} - ${label} Chart`;
        }

        this.selectchartfunction = true;

        // Restore chart by uniqueId
        this.fetchChartDataByUniqueId(uniqueId, label, this.selectedTitles, chartData);
      }
    } else {
      this.selectedTitle = selected.title;
    }
  }

  // Example helper function
  fetchChartDataByUniqueId(uniqueId: string, label: string, title: string, chartData: any) {
    // You can now use uniqueId to fetch/restore chart data
    // Example: calling backend or using local cache
    this.fetchChartDatass(label, title, chartData);

  }

  // The data we can get for db in created chart data to use loop function
  fetchChartDatass(label: string, title: string, _chartData: any, limit = this.limit, skip = this.skip): void {
    this.datagetbutton = false;

    if (!_chartData) {
      this.onChartIconClick(label);
      return;
    }

    /** Helper Functions **/

    // Filter fields by chart type prefix
    const filterChartKeys = (data: Record<string, any>, chartType: string): Record<string, any> => {
      const prefix = `${chartType}_`;
      const result: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith(prefix)) result[key] = data[key];
      });
      return result;
    };

    // Group chart fields by chart types
    const groupChartFieldsByTypes = (data: Record<string, any>, chartTypes: string[]): Record<string, Record<string, any>> => {
      const result: Record<string, Record<string, any>> = {};
      chartTypes.forEach(type => {
        const filtered = filterChartKeys(data, type);
        if (Object.keys(filtered).length) result[type] = filtered;
      });
      return result;
    };

    // Extract all field values into a flat array
    const extractFlatValues = (data: Record<string, any>): string[] => {
      const result: string[] = [];
      Object.keys(data).forEach(key => {
        if (key === 'label' || key === 'title') return;
        const value = data[key];
        if (Array.isArray(value)) result.push(...value);
        else if (typeof value === 'string') result.push(value);
      });
      return result;
    };

    /** Main Logic **/
    const chartTypes = [
      'Bar', 'Line', 'Pie', 'Donut', 'Area', 'Table', 'Radar', 'Heatmap', 'Bubble',
      'StackedColumn', 'Stackedbar', 'clusteredcolumn', 'ClusteredBar',
      'Stacked Column', 'Stackedbar', 'Clustered Column', 'clusteredbar'
    ];

    // Group chart fields and extract flat values
    const chartFieldsGrouped = groupChartFieldsByTypes(_chartData, chartTypes);
    const flatChartDataValues = extractFlatValues(_chartData);

    // Determine chart type from label
    const chartType = chartTypes.find(type => label.toLowerCase().includes(type.toLowerCase()));
    const flatChartData = chartType ? chartFieldsGrouped[chartType] || {} : {};

    // Find chart definition
    const chartDef = this.chartIcons.find(icon => icon.label === label);
    if (!chartDef) {
      this.datagetbutton = true;
      return;
    }

    const aggregationMethod = this.getValidAggregation(this.selectedAggregation);
    this.getlodingdata = true;

    // Prepare unique values for filtering
    const uniqueData = Array.from(new Set(flatChartDataValues));

    // Use previously deduped values if available
    if (this.newArrremoveDuplicates.length > 0) {
      this.newArr = [...this.newArrremoveDuplicates, ...uniqueData.slice(1)];
    } else {
      this.newArr = [...(this.newArr || []), ...uniqueData.slice(1)];
    }

    // Deduplicate before calling API
    this.newArr = this.removeDuplicates(this.newArr);
    console.log('---------------------', this.newArr);

    /** Fetch Filtered Data for UI/Table **/
    this.coreservice.getFilteredData({}, this.newArr, limit, skip).subscribe({
      next: res => {
        const Onfilterdata = [...res.data];
        this.coreservice.Onpostfilterdata(Onfilterdata);
      },
      error: err => console.error('[fetchChartDatass] Error fetching filtered data:', err)
    });

    /** Fetch Main Chart Data **/
    this.coreservice.getFilteredData({}, flatChartDataValues, limit, skip).subscribe({
      next: res => {
        const data = res.data || [];
        if (skip > 0) this.totaldata.push(...data);
        else this.totaldata = [...data];

        this.rawData = this.totaldata;
        this.datasource.data = this.totaldata;
        this.lastFieldKey = flatChartDataValues.join(',');
        this.displayedColumns = this.totaldata.length ? Object.keys(this.totaldata[0]) : [];

        const preparedChartData = {
          ..._chartData,
          activedata: this.activedata,
          data: this.totaldata,
          fields: flatChartDataValues.map(f => f.split('.')[0]),
          aggregation: aggregationMethod
        };

        this.coreservice.setChartData(label, preparedChartData);
        this.datagetbutton = true;

        // Update loading progress smoothly
        this.count++;
        this.loadingProgress = Math.round((this.count / this.Oncountdata!) * 100);

        if (this.count === this.Oncountdata) {
          const finalProgressInterval = setInterval(() => {
            if (this.loadingProgress < 100) {
              this.loadingProgress += 2;
              if (this.loadingProgress > 100) this.loadingProgress = 100;
            } else {
              clearInterval(finalProgressInterval);
              setTimeout(() => (this.loadingOverlay = false), 500);
            }
            // console.log('=-===-=-===========-=-=---------=',this.newArrremoveDuplicates);
          }, 20);
        }
      },
      error: err => {
        this.datagetbutton = true;
        this.getlodingdata = false;
        this.count++;
        this.loadingProgress = Math.round((this.count / this.Oncountdata!) * 100);
        if (this.count === this.Oncountdata) this.loadingOverlay = false;
        console.error('[fetchChartDatass] Error fetching chart data:', err);
      },
      complete: () => {
        this.getlodingdata = false;
        console.log('[fetchChartDatass] Chart data fetch completed.');
      }
    });

    this.loadingProgress = 0;
  }

  /** Store deduplicated array */
  newArrremoveDuplicates: any[] = [];

  /** Helper function to remove duplicates **/
  removeDuplicates(arr: any[]) {
    const deduped = [...new Set(arr)];
    this.newArrremoveDuplicates = deduped;
    console.log('[removeDuplicates] Final Deduplicated Array:', this.newArrremoveDuplicates);
    return deduped;
  }

  //=====================================================================================================================

  onSave(): void {
    // Validate data name
    this.dataname = this.workspacefile;
    if (!this.dataname?.trim()) {
      this.showMessage('Please enter a valid data name before saving.', 'warning');
      return;
    }

    // Ensure at least one chart is selected
    if (!this.savaprojecttochaeck) {
      this.showMessage('Please select at least one chart before saving.', 'warning');
      return;
    }

    // Confirmation before saving
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save it!"
    }).then((result) => {
      if (!result.isConfirmed) {
        this.showMessage('Project Save cancelled', 'info');
        return;
      }

      // Tab handling
      const lastTab = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1] : null;
      const newLastTab = this.tabs[this.tabs.length - 1];
      if (newLastTab?.id) {
        this.selectTab(newLastTab.id);
        if (lastTab && lastTab.label && lastTab.label.length > 0) {
          this.addTab();
        }
      }

      // Prepare payload
      this.dataloadfunction = true;
      const payload: TabData = {
        dataname: this.dataname.trim(),
        foldername: this.workspacefile1,
        tabname: [...this.tabs],
        tabdata: [...this.chartDataArray],
        OnuniqueId: [...this.uniqueIddata],
      };

      // 👇 Check if we are updating or inserting
      const request$ = this.isUpdateMode
        ? this.coreservice.updateTabs(this.dataname, payload)
        : this.coreservice.saveTabs(payload);

      request$.subscribe({
        next: (response) => {

          // Reset state
          this.tabs = [];
          this.chartDataArray = [];
          this.selectedChart = '';
          this.projectData();
          this.dataname = '';
          this.OntabButton = false;
          this.dataloadfunction = false;
          this.ngOnInit();
          this.showMessage(this.isUpdateMode ? 'Project updated successfully' : 'Project saved successfully', 'success');
        },
        error: (error) => {
          if (error.name === 'TimeoutError') {
            alert('Saving timed out after 9 seconds. Please try again.');
          } else {
            console.error('Error saving/updating tabs:', error);
          }
          this.dataloadfunction = false;
        }
      });

      this.uniqueIddata = [];
      this.Onuniquedatas = [];
    });
  }

  showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    this.snackBar.open(message, 'x ', {
      duration: 1500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`alert-${type}`, 'alert-close-red', 'alert-margin-top'] // CSS will handle styling
    });
  }

  onCancel() {
    this.tabs = [];
    this.chartDataArray = [];
    this.dataname = '';
    this.projectData();
    this.OntabButton = false;
    this.ngOnInit();
    this.chartTypes = [];
    this.activeCharts = {};
    this.selectedChart = '';
    this.uniqueIddata = [];
    this.Onuniquedatas = [];
    this.selectchartfunction = false;
    this.router.navigate(['/workspace'])
    this.showMessage('Clean the project', 'warning');
  }

  storeChartData(title: string, chartDatas: any): void {
    const newChartData = JSON.parse(JSON.stringify(chartDatas));
    const index = this.chartDataArray.findIndex(item => item.title === title);

    if (index !== -1) {
      const dataArray = this.chartDataArray[index].data;

      // Check if an entry with the same uniqueIddata exists
      const existingIndex = dataArray.findIndex(
        (d: any) => d.uniqueIddata === newChartData.uniqueIddata
      );

      if (existingIndex !== -1) {
        // Update existing entry
        dataArray[existingIndex] = newChartData;
      } else {
        // Insert new one
        dataArray.push(newChartData);
      }

      this.chartDataArray[index].data = dataArray;

      // Update project check flag
      this.savaprojecttochaeck = this.chartDataArray.some(
        item => item.data.length > 0
      );

    } else {
      // Create new entry for this title
      this.chartDataArray.push({ title, data: [newChartData] });
    }
  }

  // Get all stored data for a title
  getStoredChartData(title: string): any[] | null {
    const item = this.chartDataArray.find(i => i.title === title);
    return item ? item.data : null;
  }

  // Get chart data by label inside a title
  getChartDataByLabel(title: string, label: string): any | null {
    const titleEntry = this.chartDataArray.find(item => item.title === title);
    if (!titleEntry) return null;

    return (
      titleEntry.data.find((chart: any) => chart.label === label) || null
    );
  }

  // Get chart data by uniqueIddata inside a title
  getChartDataByUniqueId(title: string, uniqueIddata: number): any | null {
    const titleEntry = this.chartDataArray.find(item => item.title === title);
    if (!titleEntry) return null;

    return (
      titleEntry.data.find(
        (chart: any) => chart.uniqueIddata === uniqueIddata
      ) || null
    );
  }

  onChartSelect() {
    this.OntabButton = false;

    const getallformat = {
      dataname: this.selectedChart,
      foldername: this.workspacefile1
    };

    this.coreservice.getTabsByDataname(getallformat).subscribe(
      (res) => {
        this.dataname = res.dataname;
        this.tabs = res.tabname || [];
        this.chartDataArray = res.tabdata || [];
        this.uniqueIddata = res.OnuniqueId;
        this.Onuniquedatas = res.OnuniqueId;
        this.OntabButton = true;
        this.activeCharts = {};
        if (this.tabs.length > 0) {
          this.currentTabId = this.tabs[0].id;
          this.selectTab(this.currentTabId);
        } else {
          this.currentTabId = null;
        }

        ;
      },
      (err) => {
        console.error('Error fetching chart data:', err);
      }
    )
  }

  closeTab(id: number, event: MouseEvent): void {
    event.stopPropagation();

    const index = this.tabs.findIndex(tab => tab.id === id);
    if (index === -1) {
      return;
    }
    const closedTab = this.tabs[index];
    Swal.fire({
      title: `Close "${closedTab.title}"?`,
      text: "You won't be able to undo this action.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, close it",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (!result.isConfirmed) {
        this.showMessage(`Tab "${closedTab.title}" close cancelled.`, 'info');
        return;
      }
      this.selectedChart = '';
      this.selectchartfunction = false;

      // Remove tab
      this.tabs.splice(index, 1);

      // Update tab labels
      this.tabLabels = this.tabs.map(t => t.label || '');
      this.showMessage(`Tab "${closedTab.title}" closed successfully.`, 'success');

      // Re-select tab if needed
      if (this.tabs.length > 0) {
        // Prefer previous tab if exists, otherwise first tab
        const newIndex = index > 0 ? index - 1 : 0;
        this.currentTabId = this.tabs[newIndex].id;
        this.selectTab(this.currentTabId);
      } else {
        this.currentTabId = null;
      }

    });
  }

  goToTabByName(name: string): void {
    const tab = this.tabs.find(t => t.title.toLowerCase() === name.toLowerCase());
    if (tab) {
      this.selectTab(tab.id);
    }
  }

  toggleAppSide(panelNumber: number): void {
    if (panelNumber === 1) {
      this.appSide1Visible = !this.appSide1Visible;
      this.sidePanel1 = !this.sidePanel1;
    } else if (panelNumber === 2) {
      this.appSide2Visible = !this.appSide2Visible;
      this.sidePanel2 = !this.sidePanel2;
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////

  addChart(iddata: { title: string; label: string; idname?: number }): TitleGroup | null {
    const allIds = this.uniqueIddata.flatMap((g) =>
      g.Ondata.flatMap((l: any) => l.idname)
    );
    const maxId = allIds.length ? Math.max(...allIds) : 0;
    const newId = iddata.idname && iddata.idname > maxId ? iddata.idname : maxId + 1;
    let titleGroup = this.uniqueIddata.find((t) => t.title === iddata.title);

    if (!titleGroup) {
      titleGroup = {
        title: iddata.title,
        Ondata: [{ label: iddata.label, idname: [newId] }]
      };
      this.uniqueIddata.push(titleGroup);
    } else {
      let labelGroup = titleGroup.Ondata.find((l: any) => l.label === iddata.label);
      if (!labelGroup) {
        labelGroup = { label: iddata.label, idname: [newId] };
        titleGroup.Ondata.push(labelGroup);
      } else if (!labelGroup.idname.includes(newId)) {
        labelGroup.idname.push(newId);
      }
    }

    this.uniquedataid = newId;
    const selectedData = this.uniqueIddata.find((group) => group.title === this.selectedTitle);
    this.Onuniquedatas = selectedData ? [selectedData] : [];

    if (selectedData) {
      return selectedData;
    } else {
      return null;
    }
  }

  getChartDataByTitle(title: string): TitleGroup | null {
    const data = this.uniqueIddata.find((group) => group.title === title);
    this.Onuniquedatas = data ? [data] : [];
    if (data) {
      return data;
    } else {
      return null;
    }
  }

  removeChart(id: number): void {
    this.chartDataArray.forEach(titleGroup => {
      titleGroup.data = titleGroup.data.filter(
        (chart: any) => chart.uniqueIddata !== id
      );
    });

    this.chartDataArray = this.chartDataArray.filter(
      titleGroup => titleGroup.data.length > 0
    );
    this.uniqueIddata.forEach(titleGroup => {
      titleGroup.Ondata.forEach((labelGroup: { idname: any[] }) => {
        labelGroup.idname = labelGroup.idname.filter(chartId => chartId !== id);
      });
      titleGroup.Ondata = titleGroup.Ondata.filter(
        (labelGroup: { idname: any[] }) => labelGroup.idname.length > 0
      );
    });

    this.uniqueIddata = this.uniqueIddata.filter(
      titleGroup => titleGroup.Ondata.length > 0
    );

    this.savaprojecttochaeck = this.chartDataArray.some(
      item => item.data.length > 0
    );
  }

  clearAllCharts(): void {
    this.uniqueIddata = [];
  }

  getChartGroups(): TitleGroup[] {
    return this.uniqueIddata;
  }

}

