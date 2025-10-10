import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SlideMenuTab {
  label: string;
  content: any;
}

@Component({
  selector: 'app-slide-menu',
  imports: [CommonModule],
  templateUrl: './slide-menu.component.html',
  styleUrls: ['./slide-menu.component.scss']
})
export class SlideMenuComponent implements AfterViewInit {
  @Input() tabs: SlideMenuTab[] = [];
  @Input() isExpanded: boolean = true;
  @Output() tabChanged = new EventEmitter<number>();
  @Output() menuToggled = new EventEmitter<boolean>();

  @ViewChild('tabContainer') tabContainer!: ElementRef;

  activeTabIndex: number = 0;
  canScrollLeft: boolean = false;
  canScrollRight: boolean = false;

  ngAfterViewInit() {
    this.updateScrollButtons();
  }

  toggleMenu() {
    this.isExpanded = !this.isExpanded;
    this.menuToggled.emit(this.isExpanded);
  }

  selectTab(index: number) {
    this.activeTabIndex = index;
    this.tabChanged.emit(index);
  }

  scrollLeft() {
    if (this.tabContainer) {
      this.tabContainer.nativeElement.scrollBy({ left: -100, behavior: 'smooth' });
      setTimeout(() => this.updateScrollButtons(), 300);
    }
  }

  scrollRight() {
    if (this.tabContainer) {
      this.tabContainer.nativeElement.scrollBy({ left: 100, behavior: 'smooth' });
      setTimeout(() => this.updateScrollButtons(), 300);
    }
  }

  private updateScrollButtons() {
    if (this.tabContainer) {
      const container = this.tabContainer.nativeElement;
      this.canScrollLeft = container.scrollLeft > 0;
      this.canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth);
    }
  }
}