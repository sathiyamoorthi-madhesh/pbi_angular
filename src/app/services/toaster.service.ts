import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';


export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToasterService {
  private queue$ = new Subject<Toast>();
  toasts$ = this.queue$.asObservable();

  private push(message: string, type: ToastType, duration = 5000) {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.queue$.next({ id, message, type, duration });
  }

  show(message: string, type: ToastType, duration?: number) { this.push(message, type, duration); }
  success(message: string, duration?: number) { this.push(message, 'success', duration); }
  error(message: string, duration?: number)   { this.push(message, 'error', duration); }
  warning(message: string, duration?: number) { this.push(message, 'warning', duration); }
  info(message: string, duration?: number)    { this.push(message, 'info', duration); }
}