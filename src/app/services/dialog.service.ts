import { Injectable, ComponentRef, ViewContainerRef, TemplateRef } from '@angular/core';
import { DialogComponent, DialogConfig } from '../components/ui-components/dialog/dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogRef: ComponentRef<DialogComponent> | null = null;

  constructor(private viewContainerRef: ViewContainerRef) {}

  open(config: DialogConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create dialog component
      this.dialogRef = this.viewContainerRef.createComponent(DialogComponent);
      
      // Set configuration
      this.dialogRef.instance.config = config;
      this.dialogRef.instance.isOpen = true;

      // Handle button clicks
      this.dialogRef.instance.buttonClicked.subscribe(button => {
        if (button.action === 'confirm') {
          resolve(button);
        } else if (button.action === 'close') {
          reject('cancelled');
        }
      });

      // Handle dialog close
      this.dialogRef.instance.dialogClosed.subscribe(() => {
        this.close();
        reject('closed');
      });
    });
  }

  confirm(title: string, message: string): Promise<boolean> {
    return this.open({
      title,
      message,
      icon: { type: 'question' },
      buttons: [
        { text: 'Cancel', type: 'secondary', action: 'close' },
        { text: 'Confirm', type: 'primary', action: 'confirm' }
      ]
    }).then(() => true).catch(() => false);
  }

  alert(title: string, message: string): Promise<void> {
    return this.open({
      title,
      message,
      icon: { type: 'info' },
      buttons: [
        { text: 'OK', type: 'primary', action: 'close' }
      ]
    }).catch(() => {});
  }

  warning(title: string, message: string): Promise<boolean> {
    return this.open({
      title,
      message,
      icon: { type: 'warning' },
      buttons: [
        { text: 'Cancel', type: 'secondary', action: 'close' },
        { text: 'Continue', type: 'danger', action: 'confirm' }
      ]
    }).then(() => true).catch(() => false);
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.destroy();
      this.dialogRef = null;
    }
  }
}