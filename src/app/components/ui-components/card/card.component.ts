// src/app/components/ui-components/card/card.component.ts
import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pbi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent {
  @Input() title?: string;
  @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  @Input() hover = false;

  @HostBinding('class.pbi-card--hover')
  get hoverClass() {
    return this.hover;
  }

  get paddingClass() {
    switch (this.padding) {
      case 'none': return 'pbi-card__body--p0';
      case 'sm':   return 'pbi-card__body--p8';
      case 'lg':   return 'pbi-card__body--p24';
      default:     return 'pbi-card__body--p16';
    }
  }
}