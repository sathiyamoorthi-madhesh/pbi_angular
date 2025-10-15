

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
import { environment } from '../../environments/environment.development';


export interface TabData {
  dataname: string;
  foldername:string;
  tabname: any[];
  tabdata: any[];
  OnuniqueId:any[];
}

// export interface MyItem {
//   id: string;
//   name: string;
//   files: string[];
//   createdAt?: string;
// }

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
  // private baseUrl3 = 'http://localhost:4000/api';
  private baseUrl3 = 'http://localhost:5000/api'; 
   constructor(private router: Router) {}
   workspacefile1: string | null = null;

checkSession() {
    return this.http.get('/api/check-session').pipe(
      map(() => true),               
      catchError(() => of(false))    
    );
  }

  collectiondata(page: number, limit: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${environment.collectionDataUrl}`, { params });
  }
  collectionData(page: number, limit: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    console.log('Calling collection-data with params:', params.toString());

    return this.http.get<any>(`${environment.collectionDataUrl}`, { params });
  }


  saveSelectedFilter(fileName: string, selectedFilter: string[]): Observable<any> {
    return this.http.post(`${environment.saveSelectedFiltersUrl}`, { fileName, selectedFilter });
  }




  //GET COLLECTION FILE 
  getCollectionFields(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/collection-fields`);
  }
////////////////////////////////////////////////////////////////////////////////////////////
// private emitDataArray: any[] = [];

//   addOrUpdateEmitData(newData: any) {
//     const index = this.emitDataArray.findIndex(item =>
//       item.label === newData.label &&
//       item.title === newData.title &&
//       item.uniqueIddata === newData.uniqueIddata
//     );

//     if (index > -1) {
//       // ✅ update existing
//       this.emitDataArray[index] = { ...this.emitDataArray[index], ...newData };
//       console.log('Updated existing data:', this.emitDataArray[index]);
//     } else {
//       // ✅ add new
//       this.emitDataArray.push(newData);
//       console.log('Added new data:', newData);
//     }
//     console.log('---------------------the service emitDatarray---------------',this.emitDataArray);
//   }

// getEmitDataArray(uniqueIddata?: string) {
//   let result;
//   if (uniqueIddata) {
//     result = this.emitDataArray.find(item => item.uniqueIddata === uniqueIddata) || null;
//     console.log(`Retrieved data for uniqueIddata "${uniqueIddata}":`, result);
//   } else {
//     result = this.emitDataArray;
//     console.log('Retrieved all emit data:', result);
//   }
//   return result;
// }


//   clearData() {
//     this.emitDataArray = [];
//   }


////////////////////////////////////////////////////////////////////////////////////////////


// private baseUrl3 = 'http://localhost:1111/api';

saveTabs(data: TabData): Observable<any> {
  console.log('----------------------------------------0',data);
  return this.http.post(`${environment.saveTabsUrl}`, data);
}
 updateTabs(dataname: string, data: any): Observable<any> {
    return this.http.put(`${environment.updateTabsUrl}/${dataname}`, data);
  }

  // Get all saved tab data
  getAllTabs(): Observable<TabData[]> {
    return this.http.get<TabData[]>(`${environment.getAllTabsUrl}`);
  }
  
  // Delete a tab by dataname
deleteTab(file: { foldername: string; dataname: string }): Observable<any> {
  return this.http.delete(
    `${environment.deleteTabsUrl}/${file.foldername}/${file.dataname}`
  );
}
  // Get a single tab data by dataname
getTabsByDataname(dataname: any): Observable<TabData> {
  return this.http.get<TabData>(
    `${environment.getAllTabsUrl}/${dataname.foldername}/${dataname.dataname}`
  );
}


  // Get only unique datanames with error handling
  getDatanames(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.getDataNamesUrl}`).pipe(
      catchError((error) => {
        console.warn('Chart names not available, returning empty array');
        return of([]);
      })
    );
  }






/////////////////////////////////////////////////////////////////////////////////////////////////

  uploadExcel(file: File, database: string, collection: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('database', database);
    formData.append('collection', collection);

    return this.http.post(`${environment.uploadExcelUrl}`, formData);
  }

  listDatabases(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.listDatabasesUrl}`);
  }

  listCollections(dbName: string): Observable<{ collections: string[] }> {
    return this.http.get<{ collections: string[] }>(`${environment.listCollectionsUrl}/${dbName}`);
  }

  getCollectionData(dbName: string, collectionName: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.getCollectionDataUrl}/${dbName}/${collectionName}`);
  }
  getCollectionuseData(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.getCollectionDataUrl}/Testdata-Powerbi/testdata`);
  }

  updateCollection(dbName: string, collectionName: string, update: Record<string, any>): Observable<any> {
    return this.http.put(`${environment.updateCollectionUrl}/${dbName}/${collectionName}`, { update });
  }

  deleteCollection(dbName: string, collectionName: string): Observable<any> {
    return this.http.delete(`${environment.deleteCollectionUrl}/${dbName}/${collectionName}`);
  }

  getCollectionSchema(db: string, collection: string): Observable<any> {
    return this.http.get<any[]>(`${environment.getCollectionSchemaUrl}/${db}/${collection}`);
  }


  //  getCollectionFields(): Observable<{ collections: Record<string, any[]> }> {
  //   return this.http.get<{ collections: Record<string, any[]> }>(`${this.baseUrl}/collections`);
  // }







  joinCollections(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.joinCollectionsUrl}/${id}`);
  }
  // saveRelationships(relationships: any[]): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/relationships/save`, relationships);
  // }

  addData(filename: string, data: any): Observable<any> {
    return this.http.post(`${environment.basesvrUrl}/${filename}`, data);
  }

  getData(filename: string): Observable<any> {
    return this.http.get(`${environment.basesvrUrl}/${filename}`);
  }

  listFiles(): Observable<any> {
    return this.http.get(environment.basesvrUrl);
  }

  updateData(filename: string, index: number, updatedData: any): Observable<any> {
    return this.http.put(`${environment.basesvrUrl}/${filename}/${index}`, updatedData);
  }
  getSchema(filename: string): Observable<{ schema: string[] }> {
    return this.http.get<{ schema: string[] }>(`${environment.getSchemaUrl}/${filename}`);
  }

  deleteData(filename: string, index: number): Observable<any> {
    return this.http.delete(`${environment.basesvrUrl}/${filename}/${index}`);
  }

  private optionsSignal = signal<AppSettings>(defaults);

  getOptions() {
    return this.optionsSignal();
  }

  setOptions(options: Partial<AppSettings>) {
    this.optionsSignal.update((current) => ({
      ...current,
      ...options,
    }));
  }
  private dataSource = new BehaviorSubject<any>(null);
  data$ = this.dataSource.asObservable();

  setData(data: any) {
    this.dataSource.next(data);
  }

  private dbFileDataSource = new BehaviorSubject<any[]>([]);
  dbFileData$ = this.dbFileDataSource.asObservable();
  dbdatafile(data: any[]) {
    this.dbFileDataSource.next(data);
  }
  private dbFilecollectionSource = new BehaviorSubject<any[]>([]);
  dbcollectiondata$ = this.dbFilecollectionSource.asObservable();
  dbcollectiondata(data: any[]) {
    this.dbFilecollectionSource.next(data);
  }

  private dbFileSource = new BehaviorSubject<any[]>([]);
  dbdata$ = this.dbFileSource.asObservable();
  dbdata(data: any[]) {
    this.dbFilecollectionSource.next(data);
  }

//*******************************************Login ANd Rejecter*********** */


 register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl3}/register`, { username, password });
  }

  // ✅ Login and save token
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl3}/login`, { username, password }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('jwt_token', res.token); // Stored for guard & interceptor
        }
      })
    );
  }

  // ✅ Logout and redirect to login
  logout(): void {
    localStorage.removeItem('jwt_token');
    this.router.navigate(['/login']);
  }

  // ✅ Check if token exists
  isLoggedIn(): boolean {
    return !!localStorage.getItem('jwt_token');
  }

  // ✅ Access protected API endpoint
  getRejecterAccess(): Observable<any> {
    return this.http.get(`${this.baseUrl3}/rejecter`);
  }

  // ❓ Optional: get token (if needed)
  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }


//******************MENU COMPONENT API FUNCTION******************** */


 getSchemaFields(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/schema-fields`);
  }





  //****************TOOLTIPS COMPONENT API FUNCTION ***************/

  deleteSelectedFields(fileName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-fields/${fileName}`);
  }

  updateSelectedFields(fileName: string, selectedFields: string[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/update-fields`, { fileName, selectedFields });
  }

  saveSelectedFields(fileName: string, selectedFields: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/save-fields`, { fileName, selectedFields });
  }

  getMongoData(
    page: number = 1,
    limit: number = 100,
    filterField?: string,
    filterValue?: string,
    startDate?: string,
    endDate?: string,
    dateField?: string,
    fields?: string[],
    filedata?: true
  ): Observable<Blob | any> {
    const params: any = { page, limit };

    if (filterField && filterValue) {
      params.filterField = filterField;
      params.filterValue = filterValue;
    }

    if (startDate && endDate && dateField) {
      params.startDate = startDate;
      params.endDate = endDate;
      params.dateField = dateField;
    }

    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }

    if (filedata !== undefined) {
      params.filedata = filedata;
    }

    const options: any = { params };
    if (filedata) {
      options.responseType = 'blob';
    }

    return this.http.get(`${this.baseUrl}/mongo-data`, options);
  }


  getSavedFieldConfigs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get-saved-fields`);
  }



  //*****************FORMS TABLES COMPONENT API FUNCTION *******************/

  //POST THE RELATIONSHIP DATA
  postCollectionNames(collections: string[]) {
    const params = new HttpParams().set('collections', collections.join(','));
    return this.http.post(`${environment.postCollectionNamesUrl}`, {}, { params });
  }


  collectionnameindb(): Observable<any> {
    return this.http.get<any>(`${environment.dbCollectionsUrl}`);
  }



  getRelationships(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.getRelationshipsUrl}`);
  }


  deleteRelationship(id: string): Observable<any> {
    return this.http.delete(`${environment.deleteRelationshipUrl}/${id}`);
  }


  saveRelationship(rel: any): Observable<any> {
    return this.http.post(`${environment.saveRelationshipsUrl}`, rel);
  }



  //**********  TABLES COMPONENT API FUNCTION *****************


  //GET TABLE DATA FOR CHART CREATE FUNCTION
  getFilteredDatas(filters: any, selectedFields: string[]): Observable<any> {
    const fieldParam = selectedFields.join(',');
    const params = new HttpParams().set('fields', fieldParam);

    return this.http.get<any>(`${environment.getFilteredDataUrl}`, { params });
  }
  //GET CHART DATA FOR CHART CREATE FUNCTION
  // getFilteredData(
  //   filters: { [key: string]: any } = {},
  //   fields: string[] = []
  // ): Observable<{ total: number; data: any[] }> {
  //   let params = new HttpParams();

  //   for (const [key, value] of Object.entries(filters)) {
  //     if (value !== null && value !== undefined && value !== '') {
  //       params = params.set(key, value);
  //     }
  //   }

  //   if (fields.length > 0) {
  //     params = params.set('fields', fields.join(','));
  //   }

  //   return this.http.get<{ total: number; data: any[] }>(
  //     `${this.baseUrl}/collection-datas`,
  //     { params }
  //   );
  // }
  getFilteredData(
  filters: { [key: string]: any } = {},
  fields: string[] = [],
  limit?: number,
  skip?: number
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

  return this.http.get<{ total: number; data: any[] }>(
    `${environment.getFilteredData}`,
    { params }
  );
}


  //TABLE FOR CHART CREATE PAGE DATA SHARE FUNCTION (toggleNarrowMode)

  private chartPayloadSubject = new BehaviorSubject<any>(null);
  chartPayload$ = this.chartPayloadSubject.asObservable();

  setChartPayload(payload: any) {
    this.chartPayloadSubject.next(payload);
  }

  private chartDataSource = new BehaviorSubject<any>(null);
  chartData$ = this.chartDataSource.asObservable();

  // setChartData(data: any) {
  //   this.chartDataSource.next(data);
  // }




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
    console.log('----------ok----------',this.OnfilterData);
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
  if(!data){
    // console.log('---------no data-----------------');
    let allMatchingRow=[''];
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

  // ✅ set function
  setActiveDataNav(state: boolean): void {
    this.activeDataNavSubject.next(state);
    // console.log('Service: setActiveDataNav ->', state);
  }

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
    return this.http.post(`${environment.saveArrayUrl}`, items);
  }
  savefileArray(data: any[]): Observable<any> {
    // console.log('----------ok-------------',data);
    return this.http.post(`${environment.saveArrayUrl}`, data);
  }

  // Get all items (GET /get-array) with timeout
  getAll(): Observable<any> {
    return this.http.get(`${environment.getArrayUrl}`).pipe(
      catchError((error) => {
        console.warn('Backend not available, returning empty data');
        return of({ data: [] });
      })
    );
  }

  // Get one item by id (GET /get-array/:id)
  getOne(id: string): Observable<any> {
    return this.http.get(`${environment.getArrayUrl}/${id}`);
  }

  // Update one item by id (PUT /update-array/:id)
  updateItem(id: string, updatedData: Partial<any>): Observable<any> {
    return this.http.put(`${environment.updateArrayUrl}/${id}`, updatedData);
  }

  // Delete one item by id (DELETE /delete-array/:id)
  deleteItem(id: string): Observable<any> {
    return this.http.delete(`${environment.deleteArrayUrl}/${id}`);
  }
  
  deleteItemFile(folderId: string, fileName: string): Observable<any> {
    return this.http.delete(`${environment.deleteFileurl}/${folderId}/${fileName}`);
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

  // Get the latest value anytime (without subscribing)
  getCurrentData(): any {
    return this.dataSubject.value;
  }
  
}
