
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { CoreService } from '../../services/core.service';

import { MaterialImportsModule } from "../../material.imports";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-relationships',
  imports: [FormsModule, CommonModule, RouterModule, MaterialImportsModule],
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

  constructor(private coreService: CoreService) {}

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
        alert('Failed to load collections');
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
      alert('⚠️ This relationship already exists (even if reversed).');
      return;
    }

    this.coreService.saveRelationship(newRel).subscribe({
      next: () => {
        alert('Relationship saved!');
        this.loadRelationships();
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to save relationship:', err);
        alert('Failed to save relationship');
      }
    });
  } else {
    alert('Please select all fields and collections correctly.');
  }
}


  removeRelationship(index: number, id: string): void {
    
    this.coreService.deleteRelationship(id).subscribe({
      next: () => {
        if (!confirm('Are you sure you want to delete this relationship?')) return;
        this.relationships.splice(index, 1);
      },
      error: (err) => {
        console.error('Delete failed:', err);
        alert('Delete failed');
      }
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
    alert('Selected fields are already added.');
  }

  this.selectedFields = [];
  if (!this.collectionList || this.collectionList.length === 0) {
    alert('Please select at least one collection.');
    return;
  }
  
  const newCollectionNames = this.collectionList.map((field) => field.name || field).sort();
  const existingCollectionNames = (this.collectionNames || []).slice().sort();

  const isSame =
  newCollectionNames.length === existingCollectionNames.length &&
    newCollectionNames.every((val, i) => val === existingCollectionNames[i]);

  if (isSame) {
    alert('No changes detected.');
    this.collectionNames = newCollectionNames;
  
    this.collectionList = [];
    return;
  }
this.selectedFields=this.collectionNames;
this.coreService.postCollectionNames(newCollectionNames).subscribe(
  (res) => {
    // alert('Collections added successfully!');
      // console.log('Successfully submitted collections', res);

      this.collectionNames = newCollectionNames;
      
      this.collectionList = [];
    },
    (err) => {
      console.error('Error submitting collections', err);
      alert('Failed to submit collections. Please try again.');

  
      this.collectionList = [];
    }
  );
  this.ngOnInit();
}


selectfieldtrue(){
    this.selectedFields=this.collectionNames;
}

}



