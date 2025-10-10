import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClusteredbarComponent } from './clusteredbar.component';

describe('ClusteredbarComponent', () => {
  let component: ClusteredbarComponent;
  let fixture: ComponentFixture<ClusteredbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClusteredbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClusteredbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
