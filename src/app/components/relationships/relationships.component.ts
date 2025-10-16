
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { CoreService } from '../../services/core.service';
import { DialogComponent, DialogConfig, DialogButton } from '../ui-components/dialog/dialog.component';

import { MaterialImportsModule } from "../../material.imports";
import { RouterModule } from '@angular/router';
import { ToasterService } from '../../services/toaster.service';

@Component({
  selector: 'app-relationships',
  imports: [FormsModule, CommonModule, RouterModule, MaterialImportsModule, DialogComponent],
  templateUrl: './relationships.component.html',
  styleUrl: './relationships.component.scss'
})
export class RelationshipsComponent implements OnInit {
  collections: Record<string, string[]> = {};
  collectionNames: string[] = [];

  selectedSourceCollection = '';
  selectedSourceField = '';
  selectedTargetCollection = '';
  selectedTargetField = '';

  sourceFields: string[] = [];
  targetFields: string[] = [];

  relationships: any[] = [];

  // Dropdown state management
  isCollectionDropdownOpen = false;
  isSourceCollectionDropdownOpen = false;
  isSourceFieldDropdownOpen = false;
  isTargetCollectionDropdownOpen = false;
  isTargetFieldDropdownOpen = false;

  showDialog: boolean = false;
  dialogConfig: DialogConfig = {
    title: '',
    message: '',
    buttons: [],
    size: 'md',
    closable: true
  };
  private dialogCallback: (() => void) | null = null;

  constructor(private coreService: CoreService, private toaster: ToasterService) {}

  ngOnInit(): void {
    this.loadCollections();
    this.loadRelationships();
    this.collectionnamedb();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close all dropdowns when clicking outside
    this.isCollectionDropdownOpen = false;
    this.isSourceCollectionDropdownOpen = false;
    this.isSourceFieldDropdownOpen = false;
    this.isTargetCollectionDropdownOpen = false;
    this.isTargetFieldDropdownOpen = false;
  }

  private showCustomDialog(config: DialogConfig, callback?: () => void): void {
    this.dialogConfig = config;
    this.dialogCallback = callback || null;
    this.showDialog = true;
  }

  onDialogButtonClick(button: DialogButton): void {
    if (button.action === 'confirm' && this.dialogCallback) this.dialogCallback();
    this.showDialog = false;
    this.dialogCallback = null;
  }

  onDialogClosed(): void {
    this.showDialog = false;
    this.dialogCallback = null;
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.toaster.show(message, type); 
  }

  loadCollections(): void {
    this.coreService.getCollectionFields().subscribe({
      next: (res) => {
        const cleaned: Record<string, string[]> = {};

        for (const [collectionName, fields] of Object.entries(res.collections || {})) {
          cleaned[collectionName] = (fields as string[]).map(field => field.split('.')[0]);
        }
        
        this.collectionNames = Object.keys(cleaned).sort();
        this.collections = cleaned;
        console.log('✅ Collections loaded:', this.collectionNames);
        this.selectfieldtrue();

      },
      error: (err) => {
        console.error('❌ Error loading collections:', err);
        this.showMessage('Failed to load collections', 'error');
      }
    });
  }

  // Dropdown toggle methods
  toggleCollectionDropdown(): void {
    this.isCollectionDropdownOpen = !this.isCollectionDropdownOpen;
    this.closeOtherDropdowns('collection');
  }

  toggleSourceCollectionDropdown(): void {
    this.isSourceCollectionDropdownOpen = !this.isSourceCollectionDropdownOpen;
    this.closeOtherDropdowns('sourceCollection');
  }

  toggleSourceFieldDropdown(): void {
    this.isSourceFieldDropdownOpen = !this.isSourceFieldDropdownOpen;
    this.closeOtherDropdowns('sourceField');
  }

  toggleTargetCollectionDropdown(): void {
    this.isTargetCollectionDropdownOpen = !this.isTargetCollectionDropdownOpen;
    this.closeOtherDropdowns('targetCollection');
  }

  toggleTargetFieldDropdown(): void {
    this.isTargetFieldDropdownOpen = !this.isTargetFieldDropdownOpen;
    this.closeOtherDropdowns('targetField');
  }

  closeOtherDropdowns(currentDropdown: string): void {
    if (currentDropdown !== 'collection') this.isCollectionDropdownOpen = false;
    if (currentDropdown !== 'sourceCollection') this.isSourceCollectionDropdownOpen = false;
    if (currentDropdown !== 'sourceField') this.isSourceFieldDropdownOpen = false;
    if (currentDropdown !== 'targetCollection') this.isTargetCollectionDropdownOpen = false;
    if (currentDropdown !== 'targetField') this.isTargetFieldDropdownOpen = false;
  }

  // Collection selection methods
  toggleCollectionSelection(collection: any): void {
    const index = this.selectedFields.indexOf(collection);
    if (index > -1) {
      this.selectedFields.splice(index, 1);
    } else {
      this.selectedFields.push(collection);
    }
  }

  selectSourceCollection(collection: string): void {
    this.selectedSourceCollection = collection;
    this.isSourceCollectionDropdownOpen = false;
    this.onSourceCollectionChange();
  }

  selectSourceField(field: string): void {
    this.selectedSourceField = field;
    this.isSourceFieldDropdownOpen = false;
  }

  selectTargetCollection(collection: string): void {
    this.selectedTargetCollection = collection;
    this.isTargetCollectionDropdownOpen = false;
    this.onTargetCollectionChange();
  }

  selectTargetField(field: string): void {
    this.selectedTargetField = field;
    this.isTargetFieldDropdownOpen = false;
  }

  onSourceCollectionChange(): void {
    this.selectedSourceField = '';
    this.sourceFields = this.collections[this.selectedSourceCollection] || [];
  }

  onTargetCollectionChange(): void {
    this.selectedTargetField = '';
    this.targetFields = this.collections[this.selectedTargetCollection] || [];
  }

  onCollectionCheckboxChange(field: any, event: Event): void {
    event.stopPropagation();
    this.toggleCollectionSelection(field);
  }

  addRelationship(): void {
  if (
    this.selectedSourceCollection &&
    this.selectedSourceField &&
    this.selectedTargetCollection &&
    this.selectedTargetField &&
    this.selectedSourceCollection !== this.selectedTargetCollection
  ) {
    const newRel = {
      collectionA: this.selectedSourceCollection,
      fieldA: this.selectedSourceField,
      collectionB: this.selectedTargetCollection,
      fieldB: this.selectedTargetField
    };

    // Check for duplicates (in both directions)
    const alreadyExists = this.relationships.some(rel =>
      (rel.collectionA === newRel.collectionA &&
        rel.fieldA === newRel.fieldA &&
        rel.collectionB === newRel.collectionB &&
        rel.fieldB === newRel.fieldB) ||

      (rel.collectionA === newRel.collectionB &&
        rel.fieldA === newRel.fieldB &&
        rel.collectionB === newRel.collectionA &&
        rel.fieldB === newRel.fieldA)
    );

    if (alreadyExists) {
      this.showMessage('This relationship already exists (even if reversed).', 'warning');
      return;
    }

    this.coreService.saveRelationship(newRel).subscribe({
      next: () => {
        this.showMessage('Relationship saved!', 'success');
        this.loadRelationships();
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to save relationship:', err);
        this.showMessage('Failed to save relationship', 'error');
      }
    });
  } else {
    this.showMessage('Please select all fields and collections correctly.','info');
  }
}


  removeRelationship(index: number, id: string): void {
    this.showCustomDialog({
      title: 'Are you sure?',
      message: 'Do you really want to delete this relationship?',
      icon: { type: 'warning' },
      buttons: [
        { text: 'Cancel', type: 'secondary', action: 'close' },
        { text: 'Yes, delete it!', type: 'danger', action: 'confirm' }
      ]
    }, () => {
      this.coreService.deleteRelationship(id).subscribe({
        next: () => {
          this.relationships.splice(index, 1);
          this.showMessage('Relationship deleted successfully', 'success');
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.showMessage('Delete failed', 'error');
        }
      });
    });
  }

  loadRelationships(): void {
    this.coreService.getRelationships().subscribe({
      next: (data) => {
        this.relationships = data;
        console.log('Relationships loaded:', data);
        this.selectfieldtrue();
      },
      error: (err) => {
        console.error('Failed to load relationships:', err);
      }
    });
  }

  resetForm(): void {
    this.selectedSourceCollection = '';
    this.selectedSourceField = '';
    this.selectedTargetCollection = '';
    this.selectedTargetField = '';
    this.sourceFields = [];
    this.targetFields = [];
    
    // Close all dropdowns
    this.isCollectionDropdownOpen = false;
    this.isSourceCollectionDropdownOpen = false;
    this.isSourceFieldDropdownOpen = false;
    this.isTargetCollectionDropdownOpen = false;
    this.isTargetFieldDropdownOpen = false;
  }



itaddcollection:boolean=false;
visibleFieldList: any[] = [];
selectedFields: any[] = [];
collectionList: any[] = [];

collectionnamedb() {
  this.coreService.collectionnameindb().subscribe(
    (res) => {
      this.visibleFieldList = res;
      this.selectfieldtrue();
      console.log('-----collection name------------', res);
    },
    (err) => {
      console.log(err);
    }
  );
}


removeField(index: number) {
  this.collectionList.splice(index, 1);
}

submitCollections() {
  
  let added = false;
  
  for (let field of this.selectedFields) {
    if (!this.collectionList.includes(field)) {
      this.collectionList.push(field);
      added = true;
    }
  }
  
  if (added) {
    this.itaddcollection = true;
  } else {
    this.showMessage('Selected fields are already added.','info');
  }

  this.selectedFields = [];
  if (!this.collectionList || this.collectionList.length === 0) {
    this.showMessage('Please select at least one collection.','info');
    return;
  }
  
  const newCollectionNames = this.collectionList.map((field) => field.name || field).sort();
  const existingCollectionNames = (this.collectionNames || []).slice().sort();

  const isSame =
  newCollectionNames.length === existingCollectionNames.length &&
    newCollectionNames.every((val, i) => val === existingCollectionNames[i]);

  if (isSame) {
    this.showMessage('No changes detected.','info');
    this.collectionNames = newCollectionNames;
    this.collectionList = [];
    return;
  }
this.selectedFields=this.collectionNames;
this.coreService.postCollectionNames(newCollectionNames).subscribe(
  (res) => {
    this.showMessage('Collections added successfully!','success');
      // console.log('Successfully submitted collections', res);

      this.collectionNames = newCollectionNames;
      
      this.collectionList = [];
    },
    (err) => {
      console.error('Error submitting collections', err);
      this.showMessage('Failed to submit collections. Please try again.','error');
      this.collectionList = [];
    }
  );
  this.ngOnInit();
}


selectfieldtrue(){
    this.selectedFields=this.collectionNames;
}

}



