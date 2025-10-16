import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DialogButton {
  text: string;
  type: 'primary' | 'secondary' | 'danger';
  action: 'close' | 'confirm' | 'custom';
  disabled?: boolean;
}

export interface DialogConfig {
  title: string;
  message?: string;
  icon?: {
    type: 'warning' | 'error' | 'success' | 'info' | 'question';
    color?: string;
  };
  buttons?: DialogButton[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() config: DialogConfig = {
    title: '',
    message: '',
    buttons: [
      { text: 'Cancel', type: 'secondary', action: 'close' },
      { text: 'Confirm', type: 'primary', action: 'confirm' }
    ],
    size: 'md',
    closable: true
  };

  @Output() dialogClosed = new EventEmitter<void>();
  @Output() buttonClicked = new EventEmitter<DialogButton>();
  @Output() backdropClicked = new EventEmitter<void>();

  @ViewChild('dialogElement', { static: false }) dialogElement!: ElementRef<HTMLDialogElement>;

  ngOnInit(): void {
    // Listen for escape key
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  ngOnChanges(): void {
    if (this.dialogElement) {
      if (this.isOpen) {
        this.dialogElement.nativeElement.showModal();
        document.body.style.overflow = 'hidden'; // Prevent background scroll
      } else {
        this.dialogElement.nativeElement.close();
        document.body.style.overflow = 'unset';
      }
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen && this.config.closable) {
      this.closeDialog();
    }
  }

  closeDialog(): void {
    this.isOpen = false;
    this.dialogClosed.emit();
    document.body.style.overflow = 'unset';
  }

  onButtonClick(button: DialogButton): void {
    if (button.disabled) return;

    this.buttonClicked.emit(button);
    
    if (button.action === 'close') {
      this.closeDialog();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogElement?.nativeElement) {
      this.backdropClicked.emit();
      if (this.config.closable) {
        this.closeDialog();
      }
    }
  }

  getDialogSizeClasses(): string {
    const sizeMap = {
      'sm': 'sm:max-w-sm',
      'md': 'sm:max-w-lg',
      'lg': 'sm:max-w-2xl',
      'xl': 'sm:max-w-4xl'
    };
    return sizeMap[this.config.size || 'md'];
  }

  getIconClasses(): string {
    const baseClasses = 'size-6';
    const colorMap = {
      'warning': 'text-red-600',
      'error': 'text-red-600',
      'success': 'text-teal-600',  
      'info': 'text-teal-600',      
      'question': 'text-teal-600'   
    };
    return `${baseClasses} ${colorMap[this.config.icon?.type || 'warning']}`;
  }

  getIconBgClasses(): string {
    const bgMap = {
      'warning': 'bg-red-100',
      'error': 'bg-red-100',
      'success': 'bg-teal-100',  
      'info': 'bg-teal-100',     
      'question': 'bg-teal-100'  
    };
    return bgMap[this.config.icon?.type || 'warning'];
  }

  getFontAwesomeIcon(): string {
    const iconMap = {
      'warning': 'fas fa-exclamation-triangle text-red-600',
      'error': 'fas fa-times-circle text-red-600',
      'success': 'fas fa-check-circle text-teal-600',
      'info': 'fas fa-info-circle text-teal-600',
      'question': 'fas fa-question-circle text-teal-600'
    };
    return iconMap[this.config.icon?.type || 'warning'];
  }

  getButtonClasses(button: DialogButton): string {
    const base =
      'inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-md shadow-xs sm:w-auto box-border whitespace-nowrap transition duration-150';
  
    const type = {
      primary:   'bg-teal-600 text-white hover:bg-teal-500 shadow-md shadow-teal-700/30 border border-transparent',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
      danger:    'bg-red-600 text-white hover:bg-red-500 border border-transparent',
    }[button.type];
  
    const disabled = button.disabled ? 'opacity-50 cursor-not-allowed' : '';
    return `${base} ${type} ${disabled}`.trim();
  }
}