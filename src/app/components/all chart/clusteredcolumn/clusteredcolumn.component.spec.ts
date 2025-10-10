import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClusteredcolumnComponent } from './clusteredcolumn.component';

describe('ClusteredcolumnComponent', () => {
  let component: ClusteredcolumnComponent;
  let fixture: ComponentFixture<ClusteredcolumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClusteredcolumnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClusteredcolumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
