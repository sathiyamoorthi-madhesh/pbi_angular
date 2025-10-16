import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { ToasterService, Toast } from '../../../services/toaster.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toaster.component.html',
  styleUrl: './toaster.component.scss'
})
export class ToasterComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private toast: ToasterService) {}

  ngOnInit(): void {
    this.sub = this.toast.toasts$.subscribe(t => {
      this.toasts.push(t);
      const id = t.id;
      timer(t.duration).subscribe(() => this.close(id));
    });
  }

  close(id: string) {
    this.toasts = this.toasts.filter(x => x.id !== id);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // Tailwind class helpers
  wrap(t: Toast) {
    const map: any = {
      success: 'bg-green-50 ring-green-200',
      error:   'bg-red-50 ring-red-200',
      warning: 'bg-orange-50 ring-orange-200',
      info:    'bg-blue-50 ring-blue-200'
    };
    return `flex items-center w-full max-w-xs p-4 mb-3 rounded-lg shadow-sm ring-1 ${map[t.type]}`;
  }

  chip(t: Toast) {
  const map: any = {
    success: 'text-green-700 bg-green-100',
    error:   'text-red-700 bg-red-100',
    warning: 'text-orange-700 bg-orange-100',
    info:    'text-blue-700 bg-blue-100'
  };
  return `inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-lg ${map[t.type]}`;
}

textClass(t: Toast) {
  const map: any = {
    success: 'text-green-900',
    error:   'text-red-900',
    warning: 'text-orange-900',
    info:    'text-blue-900'
  };
  return map[t.type];
}

  iconPath(t: Toast) {
    switch (t.type) {
      case 'success': return 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L9 10.586l3.293-3.293A1 1 0 0 1 13.707 8.707Z';
      case 'error':   return 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 1 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 1 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 1 1 1.414 1.414L11.414 10l2.293 2.293Z';
      case 'warning': return 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z';
      default:        return 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm0 4.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1 3.75a1 1 0 0 0-2 0v5a1 1 0 1 0 2 0V8.5Z';
    }
  }
}