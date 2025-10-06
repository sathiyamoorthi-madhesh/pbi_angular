import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreService } from '../../services/core.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface Folder {
  id: string;
  name: string;
  files: FileItem[];
  createdAt: Date;
}

interface FileItem {
  id?: string;
  name: string;
  type: 'report' | 'dataset' | 'dashboard' | 'dataflow';
  size?: string;
  lastModified: Date;
}

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent implements OnInit {
  folders: Folder[] = [];
  filteredFolders: Folder[] = [];
  filteredfiles: FileItem[] = [];

  selectedFolder: any | null = null;
  OnFoldername: string = '';

  newFolderName: string = '';
  isCreatingFolder: boolean = false;

  showCreateForm: boolean = false;
  newFile: FileItem = {
    name: '',
    type: 'report',
    lastModified: new Date()
  };

  chartNames: any;
  searchQuery: string = '';
  isLoading: boolean = true;

  @Output() dataEmitter = new EventEmitter<any>();

  constructor(private coreService: CoreService, private router: Router) { }

  folderproject: any;
  Ondata: any;

  /** ------------------- Lifecycle ------------------- **/
  ngOnInit(): void {
    this.loadData();
    this.projectData();
  }

  loadData() {
    this.coreService.getAll().subscribe({
      next: (res) => {
        this.folders = res?.data || [];
        this.Ondata = [...this.folders];
        this.filteredFolders = [...this.folders];
        this.folderproject = this.coreService.workspacefile1;
        this.findarraydata();
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('Backend not available, using mock data:', err);
        // Use mock data when backend is not available
        this.folders = [
          {
            id: '1',
            name: 'Sample Workspace',
            files: [],
            createdAt: new Date()
          }
        ];
        this.filteredFolders = [...this.folders];
        this.isLoading = false;
      }
    });
  }

  findarraydata() {
    if (this.folderproject) {
      const folder = this.folders.find(p => p.name === this.folderproject);
      if (folder) this.openFolder(folder);
    }
  }

  /** ------------------- Search ------------------- **/
  searchFolders(): void {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredFolders = query
      ? this.folders.filter(folder => folder.name.toLowerCase().includes(query))
      : [...this.folders];
  }

  searchFiles(): void {
    if (!this.selectedFolder) return;
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredfiles = query
      ? this.selectedFolder.files.filter((file: any) => file.name.toLowerCase().includes(query))
      : [...this.selectedFolder.files];
  }

  /** ------------------- Folder Methods ------------------- **/
  addFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) return;

    if (this.folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      Swal.fire("Duplicate", "A folder with this name already exists.", "warning");
      return;
    }

    const newFolder: Folder = {
      id: this.generateId(),
      name,
      files: [],
      createdAt: new Date()
    };

    this.folders.push(newFolder);
    this.filteredFolders = [...this.folders];
    this.resetFolderForm();
    this.storeData();
    this.folders = [];
  }

  removeFolder(folderId: string): void {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return;

    const hasFiles = folder.files.length > 0;
    const message = hasFiles
      ? `Delete "${folder.name}" and its ${folder.files.length} file(s)?`
      : `Delete "${folder.name}"?`;

    Swal.fire({
      title: "Are you sure?",
      text: message,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!"
    }).then(result => {
      if (result.isConfirmed) {
        this.folders = this.folders.filter(f => f.id !== folderId);
        if (this.selectedFolder?.id === folderId) this.selectedFolder = null;
        this.filteredFolders = [...this.folders];
        this.storeData();
        this.showMessage("Folder deleted successfully", "success");
      }
    });
  }

  openFolder(folder: Folder): void {
    this.selectedFolder = folder;
    console.log('select folder name', folder.name);
    this.OnFoldername = folder.name;
    // this.folderproject=folder.name;
    this.filteredfiles = [...folder.files];
  }

  closeFolder(): void {
    this.selectedFolder = null;
    this.filteredfiles = [];
  }

  toggleCreateFolder(): void {
    this.isCreatingFolder = !this.isCreatingFolder;
    if (!this.isCreatingFolder) this.resetFolderForm();
  }

  cancelCreateFolder(): void {
    this.resetFolderForm();
  }

  getFolderStats(folder: Folder): string {
    const fileCount = folder.files.length;
    return fileCount === 0 ? 'Empty' : `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
  }

  private resetFolderForm(): void {
    this.newFolderName = '';
    this.isCreatingFolder = false;
  }

  getFolderIcon(): string {
    return 'folder';
  }

  /** ------------------- File Methods ------------------- **/
  getFileIcon(type: string): string {
    const icons: Record<string, string> = {
      report: 'bar_chart',
      dataset: 'storage',
      dashboard: 'insert_chart',
      dataflow: 'autorenew'
    };
    return icons[type] || 'description';
  }

  getFileTypeDisplay(type: string): string {
    const typeMap: Record<string, string> = {
      report: 'Report',
      dataset: 'Dataset',
      dashboard: 'Dashboard',
      dataflow: 'Dataflow'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  createNewReport(): void {
    if (!this.selectedFolder) return;
    const newReport: FileItem = {
      name: `New Report ${this.selectedFolder.files.length + 1}`,
      type: 'report',
      size: '0 KB',
      lastModified: new Date()
    };
    this.selectedFolder.files.push(newReport);
    this.filteredfiles = [...this.selectedFolder.files];
    this.storefileData();
  }

  storefileData(): void {
    if (!this.selectedFolder) {
      console.error('No folder selected');
      return;
    }

    // Wrap in array if it's a single object
    const dataCopy = Array.isArray(this.selectedFolder)
      ? [...this.selectedFolder]
      : [this.selectedFolder];

    this.coreService.savefileArray(dataCopy).subscribe({
      next: () => {
        this.showMessage("Data saved successfully!", "success");
      },
      error: () => {
        this.showMessage("Failed to save data. Please try again.", "error");
      }
    });
  }



  openCreateFile(): void {
    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.newFile = { name: '', type: 'report', lastModified: new Date() };
  }

  createFile(): void {
    const name = this.newFile.name?.trim();

    if (!name || !this.selectedFolder) return;

    if (this.selectedFolder.files.some((f: any) => f.name.toLowerCase() === name.toLowerCase())) {
      Swal.fire("Duplicate", "A file with this name already exists in this folder.", "warning");
      return;
    }

    const fileToAdd: FileItem = { ...this.newFile, lastModified: new Date() };
    this.selectedFolder.files.push(fileToAdd);
    // console.log("--------------------------------------------------943502893573093584095--------------------------------",name,this.selectedFolder)
    this.filteredfiles = [...this.selectedFolder.files];
    // console.log('-----------------------------',this.filteredFolders);
    this.storefileData();
    this.closeCreateForm();
  }

  deleteFolderFile(folderId: string, fileName: string) {
    if (!fileName?.trim()) {
      Swal.fire("Error", "No project name specified to delete.", "error");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete the project "${fileName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then(result => {
      if (!result.isConfirmed) return;

      this.coreService.deleteItemFile(folderId, fileName).subscribe(
        () => {
          const folder = this.folders.find(f => f.id === folderId);
          if (folder) {
            folder.files = folder.files.filter(f => f.name !== fileName);
          }
          if (this.selectedFolder?.id === folderId) {
            this.filteredfiles = [...this.selectedFolder.files];
          }
          const allfiledelete = { dataname: fileName, foldername: this.OnFoldername };

          this.coreService.deleteTab(allfiledelete).subscribe(
            () => this.showMessage(`Project "${fileName}" deleted successfully`, "success"),
            err => {
              console.error("Error deleting project tab:", err);
              this.showMessage("Folder deleted successfully", "success");
            }
          );
        },
        err => {
          console.error("Error deleting file:", err);
          Swal.fire("Error", "Error deleting file. Please try again.", "error");
        }
      );
    });
  }

  deleteFolder(folderId: string, folder: Folder) {
    if (folder.files.length === 0) {
      Swal.fire({
        title: "Are you sure?",
        text: "Do you really want to delete this folder?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
      }).then((result) => {
        if (result.isConfirmed) {
          this.coreService.deleteItem(folderId).subscribe(
            res => {
              console.log('Folder deleted:', res);

              // ✅ Remove from local state
              this.folders = this.folders.filter(f => f.id !== folderId);
              this.filteredFolders = [...this.folders];

              // ✅ If the deleted folder was selected, clear it
              if (this.selectedFolder?.id === folderId) {
                this.selectedFolder = null;
                this.filteredfiles = [];
              }

              this.showMessage("Folder deleted successfully", "success");
            },
            err => {
              console.error('Error deleting folder:', err);
              Swal.fire("Error", "Error deleting folder. Please try again.", "error");
            }
          );
        } else {
          this.showMessage("Folder deletion cancelled", "info");
        }
      });
    } else {
      Swal.fire(
        "Cannot Delete",
        "This folder contains project files. Please remove them first.",
        "info"
      );
    }
  }

  /** ------------------- Backend Calls ------------------- **/
  projectData(): void {
    this.coreService.getDatanames().subscribe({
      next: (res: string[]) => this.chartNames = res || [],
      error: (error) => {
        console.warn('Chart names not available, using empty array:', error);
        this.chartNames = [];
      }
    });
  }

  storeData(): void {
    const dataCopy = [...this.folders];
    this.coreService.saveArray(dataCopy).subscribe({
      next: () => {
        this.showMessage("Data saved successfully!", "success");
        this.ngOnInit();
      },
      error: () => {
        this.showMessage("Failed to save data. Please try again.", "error");
      }
    });
  }

  /** ------------------- Utils ------------------- **/
  onNameEmit(name: any) {
    const data = { name: name, OnFoldername: this.OnFoldername };
    this.coreService.sendData(data);
    const formattedData = '';
    this.coreService.Onpostrelationdata(formattedData);
    this.router.navigate(['/dashboard']);
  }

  formatDate(date: any): string {
    return new Date(date).toDateString();
  }

  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    Swal.fire({ text: message, icon: type, timer: 2000, showConfirmButton: false });
  }
}
