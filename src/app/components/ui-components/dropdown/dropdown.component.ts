import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DropdownOption {
  value: any;
  label: string;
  disabled?: boolean;
}

export interface DropdownSelection {
  field: string;
  values: any[];
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit, OnDestroy {
  @Input() options: DropdownOption[] = [];
  @Input() selectedValues: any[] = [];
  @Input() field: string = '';
  @Input() placeholder: string = '-- Select Option --';
  @Input() multiple: boolean = true;
  @Input() maxSelections: number = Infinity;
  @Input() disabled: boolean = false;
  @Input() compact: boolean = true;
  
  @Output() selectionChange = new EventEmitter<DropdownSelection>();
  
  isOpen = false;
  
  ngOnInit(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }
  
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }
  
  handleClickOutside(event: Event): void {
    this.isOpen = false;
  }
  
  getDisplayText(): string {
    if (!this.selectedValues || this.selectedValues.length === 0) {
      return this.placeholder;
    }
    
    if (this.multiple) {
      if (this.selectedValues.length === 1) {
        const option = this.options.find(opt => opt.value === this.selectedValues[0]);
        return option ? option.label : this.selectedValues[0];
      }
      return `${this.selectedValues.length} item(s) selected`;
    } else {
      const option = this.options.find(opt => opt.value === this.selectedValues[0]);
      return option ? option.label : this.selectedValues[0];
    }
  }
  
  isSelected(option: DropdownOption): boolean {
    return this.selectedValues && this.selectedValues.includes(option.value);
  }
  
  isDisabled(option: DropdownOption): boolean {
    return option.disabled || this.isSelectionLimitReached(option);
  }
  
  isSelectionLimitReached(option: DropdownOption): boolean {
    if (!this.multiple || this.maxSelections === Infinity) {
      return false;
    }
    
    const isCurrentlySelected = this.selectedValues && this.selectedValues.includes(option.value);
    return !isCurrentlySelected && this.selectedValues && this.selectedValues.length >= this.maxSelections;
  }
  
  toggleSelection(option: DropdownOption, event: Event): void {
    event.stopPropagation();
    
    if (this.disabled || option.disabled || this.isSelectionLimitReached(option)) {
      return;
    }
    
    let newValues = [...(this.selectedValues || [])];
    
    if (this.multiple) {
      const index = newValues.indexOf(option.value);
      if (index > -1) {
        newValues.splice(index, 1);
      } else {
        newValues.push(option.value);
      }
    } else {
      newValues = [option.value];
      this.isOpen = false; // Close dropdown for single selection
    }
    
    this.selectedValues = newValues;
    this.selectionChange.emit({
      field: this.field,
      values: newValues
    });
  }
  
  getButtonClasses(): string {
    const baseClasses = 'w-full px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition duration-150 text-gray-700 text-left flex justify-between items-center';
    const compactClasses = this.compact ? 'compact-field-select' : '';
    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `${baseClasses} ${compactClasses} ${disabledClasses}`.trim();
  }
  
  getDropdownClasses(): string {
    return 'absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto';
  }
  
  getOptionClasses(): string {
    const baseClasses = 'flex items-center p-1.5 hover:bg-teal-50 rounded cursor-pointer transition-colors duration-150';
    return baseClasses;
  }
}