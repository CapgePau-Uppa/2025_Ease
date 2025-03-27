import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationDropdownComponent } from './location-dropdown.component';

describe('LocationDropdownComponent', () => {
  let component: LocationDropdownComponent;
  let fixture: ComponentFixture<LocationDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
