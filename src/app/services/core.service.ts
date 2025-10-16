

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { AppSettings, defaults } from '../config';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { observableToBeFn } from 'rxjs/internal/testing/TestScheduler';
import { environment } from '../../environments/environment';


export interface TabData {
  dataname: string;
  foldername: string;
  tabname: any[];
  tabdata: any[];
  OnuniqueId: any[];
}

export interface User {
  _id?: string;
  name: string;
  username: string;
  password?: string;
  role: 'Admin' | 'User';
  status: 'Active' | 'Inactive';
}

export interface TableRow {
  [key: string]: any;
}
@Injectable({
  providedIn: 'root',
})
export class CoreService {
  sharedChartData$: any;
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';
  private baseUrl3 = 'http://localhost:3000/api';
  constructor(private router: Router) { }
  workspacefile1: string | null = null;


  //GET COLLECTION FILE 
  getCollectionFields(): Observable<any> {
    return this.http.get<any>(`${environment.getCollectionFieldsUrl}`);
  }
  

  saveTabs(data: TabData): Observable<any> {
    console.log('----------------------------------------0', data);
    return this.http.post(`${environment.TabsUrl}`, data);
  }
  updateTabs(dataname: string, data: any): Observable<any> {
    return this.http.put(`${environment.TabsUrl}/${dataname}`, data);
  }


  // Delete a tab by dataname
  deleteTab(file: { foldername: string; dataname: string }): Observable<any> {
    return this.http.delete(
      `${environment.TabsUrl}/${file.foldername}/${file.dataname}`
    );
  }
  // Get a single tab data by dataname
  getTabsByDataname(dataname: any): Observable<TabData> {
    return this.http.get<TabData>(
      `${environment.TabsUrl}/${dataname.foldername}/${dataname.dataname}`
    );
  }


  // Get only unique datanames
  getDatanames(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.getDatanamesUrl}`);
  }


  private optionsSignal = signal<AppSettings>(defaults);


  private dataSource = new BehaviorSubject<any>(null);
  data$ = this.dataSource.asObservable();


  private dbFileDataSource = new BehaviorSubject<any[]>([]);
  dbFileData$ = this.dbFileDataSource.asObservable();

  private dbFilecollectionSource = new BehaviorSubject<any[]>([]);
  dbcollectiondata$ = this.dbFilecollectionSource.asObservable();


  private dbFileSource = new BehaviorSubject<any[]>([]);
  dbdata$ = this.dbFileSource.asObservable();
 








 




  //*****************FORMS TABLES COMPONENT API FUNCTION *******************/

  //POST THE RELATIONSHIP DATA
  postCollectionNames(collections: string[]) {
    const params = new HttpParams().set('collections', collections.join(','));
    return this.http.post(`${environment.postCollectionNamesUrl}`, {}, { params });
  }


  collectionnameindb(): Observable<any> {
    return this.http.get<any>(`${environment.getcollectionNameUrl}`);
  }



  getRelationships(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.RelationshipsUrl}`);
  }


  deleteRelationship(id: string): Observable<any> {
    return this.http.delete(`${environment.RelationshipsUrl}/${id}`);
  }


  saveRelationship(rel: any): Observable<any> {
    return this.http.post(`${environment.RelationshipsUrl}`, rel);
  }



  //**********  TABLES COMPONENT API FUNCTION *****************


  getFilteredData(
    filters: { [key: string]: any } = {},
    fields: string[] = [],
    limit?: number,
    skip?: number,
    aggregationMethod:string=""
  ): Observable<{ total: number; data: any[] }> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    if (fields.length > 0) {
      params = params.set('fields', fields.join(','));
    }

    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    if (skip !== undefined) {
      params = params.set('skip', skip.toString());
    }

    if (aggregationMethod !== undefined) {
      if(aggregationMethod === "sum"){
        aggregationMethod = "Sum"
      }
      params = params.set('aggregationMethod', aggregationMethod.toString());
    }

    return this.http.get<{ total: number; data: any[] }>(
      `${this.baseUrl}/collection-datas`,
      { params }
    );
  }
  
  getFilteredData_Test1(
    filters: { [key: string]: any } = {},
    fieldsX: string[] = [],
    fieldsY: string[] = [],
    legend: string="",
    aggregationMethod:string=""
  ): Observable<{ total: number; data: any[] }> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    if (fieldsX.length > 0) {
      params = params.set('x_fields', fieldsX.join(','));
    }
    if (fieldsY.length > 0) {
      params = params.set('y_fields', fieldsY.join(','));
    }

    if (legend !== undefined) {
      const [field, dataBase] = legend.trim().split('.');
      params = params.set('legend', field.toString());
    }

    // if (skip !== undefined) {
    //   params = params.set('skip', skip.toString());
    // }

    if (aggregationMethod !== undefined) {
      if(aggregationMethod === "sum"){
        aggregationMethod = "Sum"
      }
      params = params.set('aggregationMethod', aggregationMethod.toString());
    }

    return this.http.get<{ total: number; data: any[] }>(
      `${environment.getFilteredDataUrl}`,
      { params }
    );
  }


  //TABLE FOR CHART CREATE PAGE DATA SHARE FUNCTION (toggleNarrowMode)

  private chartPayloadSubject = new BehaviorSubject<any>(null);
  chartPayload$ = this.chartPayloadSubject.asObservable();

 

  private chartDataSource = new BehaviorSubject<any>(null);
  chartData$ = this.chartDataSource.asObservable();

  


  //TABLE FOR CHART CREATE PAGE DATA SHARE FUNCTION
  private chartDataMap = new Map<string, BehaviorSubject<any>>();

  // @OUTPUT FUNCTION
  setChartData(label: string, data: any) {
    // console.log(label,data)
    if (!this.chartDataMap.has(label)) {
      this.chartDataMap.set(label, new BehaviorSubject<any>(data));
    } else {
      this.chartDataMap.get(label)!.next(data);
    }
    // console.log('Title:',data)
  }
  // @INPUT
  getChartData(label: string): Observable<any> {
    if (!this.chartDataMap.has(label)) {
      this.chartDataMap.set(label, new BehaviorSubject<any>(null));
    }
    return this.chartDataMap.get(label)!.asObservable();
  }

  //-------------------------------On filter data------------------------------------------


  private OnfilterData: any[] = [];

  Onpostfilterdata(data: any): void {
    this.OnfilterData = data;
    console.log('----------ok----------', JSON.stringify(this.OnfilterData));
  }

  Ongetfilterdata(): any[] {
    return this.OnfilterData;
  }
  private OnrelationDataSubject = new BehaviorSubject<any[]>([]);

  // Observable for components to subscribe to automatically
  OnrelationData$: Observable<any[]> = this.OnrelationDataSubject.asObservable();

  Onpostrelationdata(data: any): void {
    // console.log('----------ok----------', data);
    // console.log('----------ok----------', data.length);
    // console.log('----------ok----------', Array.isArray(data.length));
    if (!data) {
      // console.log('---------no data-----------------');
      let allMatchingRow = [''];
      this.OnrelationDataSubject.next(allMatchingRow);
      return
    }


    // Only add full objects (skip partial arrays like {SenderID: ['TPA004']})
    const isFullObject = Object.values(data).some(v => typeof v !== 'object' || !Array.isArray(v));
    // console.log(isFullObject);
    if (isFullObject) {
      this.OnfilterData.push(data);
    }

    // Log field names and values
    const keys = Object.keys(data);
    const values = Object.values(data).map(v => Array.isArray(v) ? v[0] : v);
    // console.log('Array names:', keys);
    // console.log('Array values:', values);

    // Filter stored data by this new row
    let allMatchingRows = this.OnfilterData.filter(row => {
      return keys.every((key, index) => {
        const value = values[index];
        const rowValue = Array.isArray(row[key]) ? row[key][0] : row[key];
        return rowValue === value;
      });
    });

    // console.log('Matching rows for new data:', allMatchingRows);

    // Emit filtered rows
    this.OnrelationDataSubject.next(allMatchingRows);
  }

  // Optional: synchronous getter
  Ongetreltiondata(): any[] {
    return this.OnrelationDataSubject.getValue();
  }


  //////////////////////////////////////////////////////////////////////////////////////////////

  private activeDataNavSubject = new BehaviorSubject<boolean>(false);

  // ✅ Observable for components to subscribe
  activeDataNav$ = this.activeDataNavSubject.asObservable();



  // ✅ toggle function
  toggleActiveDataNav(): void {
    const current = this.activeDataNavSubject.value;
    this.activeDataNavSubject.next(!current);
    // console.log('Service: toggleActiveDataNav ->', !current);
  }





  ///===============================workspace===========================

  // Save multiple items (POST /save-array)
  saveArray(items: any[]): Observable<any> {
    // console.log('----------ok-------------',items);
    return this.http.post(`${environment.workspaceUrl}`, items);
  }
  savefileArray(data: any[]): Observable<any> {
    // console.log('----------ok-------------',data);
    return this.http.post(`${environment.workspaceFilesUrl}`, data);
  }

  // Get all items (GET /get-array)
  getAll(): Observable<any> {
    return this.http.get(`${environment.workspaceUrl}`);
  }

  // Get one item by id (GET /get-array/:id)
  getOne(id: string): Observable<any> {
    return this.http.get(`${environment.workspaceUrl}/${id}`);
  }


  // Delete one item by id (DELETE /delete-array/:id)
  deleteItem(id: string): Observable<any> {
    return this.http.delete(`${environment.workspaceUrl}/${id}`);
  }

  deleteItemFile(folderId: string, fileName: string): Observable<any> {
    return this.http.delete(`${environment.workspaceFilesUrl}/${folderId}/${fileName}`);
  }

  //==============workspace data to send and get================
  private dataSubject = new BehaviorSubject<any>(null);

  // Send new data → replaces old value
  sendData(data: any) {
    console.log('CoreService sending (replacing old):', data);
    this.dataSubject.next(data);
  }

  // Get as observable (subscribe in components)
  getDatas(): Observable<any> {
    return this.dataSubject.asObservable();
  }












  //=================================================
  //                      user management
  //=================================================

  // Get all users
  getuserdata(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl3}/users`);
  }


  getUserDataSearch(filters: any): Observable<any> {
    let params: any = {};
    for (const key in filters) {
      if (filters[key]) params[key] = filters[key]; // only send non-empty fields
    }
    return this.http.get<any>(`${this.baseUrl3}/searchuser`, { params });
  }


  // Add new user
  adduserdata(user: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl3}/users`, user);
  }

  // Update user by _id (recommended)
  updateuserdata(id: string, user: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl3}/users/${id}`, user);
  }

  // Delete user by _id
  deleteuserdata(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl3}/users/${id}`);
  }


  //=======================================================


  private allaxisdata:any[] = [];

  setAllAxisData(data:any):void{
    this.allaxisdata.push(data)
  }

  getAllAxisData():any[]{
    return this.allaxisdata

  }

      private collectionsdata:any=[]=[]
    postCollectionName(collections:any){
      this.collectionsdata=collections;
      console.log('---------collecrtion------------',this.collectionsdata);
    }

    getCollectionDatas():any{
      return this.collectionsdata;
    }
}
