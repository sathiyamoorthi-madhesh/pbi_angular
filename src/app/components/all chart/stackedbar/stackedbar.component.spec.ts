import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StackedbarComponent } from './stackedbar.component';

describe('StackedbarComponent', () => {
  let component: StackedbarComponent;
  let fixture: ComponentFixture<StackedbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StackedbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StackedbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
