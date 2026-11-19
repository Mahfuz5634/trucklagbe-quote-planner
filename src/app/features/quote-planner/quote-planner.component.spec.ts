import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuotePlannerComponent } from './quote-planner.component';

describe('QuotePlannerComponent (Form, Validation, UI)', () => {
  let component: QuotePlannerComponent;
  let fixture: ComponentFixture<QuotePlannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotePlannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotePlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize trip form with 1 pickup and 1 default drop-off stop', () => {
    expect(component).toBeTruthy();
    expect(component.tripForm).toBeDefined();
    expect(component.dropOffControls.length).toBe(1);
    expect(component.tripForm.get('truckCategoryId')?.value).toBe('medium');
    expect(component.tripForm.get('truckCount')?.value).toBe(1);
  });

  it('should allow adding drop-offs up to maximum of 3 stops', () => {
    expect(component.dropOffControls.length).toBe(1);

    component.addDropOff();
    expect(component.dropOffControls.length).toBe(2);

    component.addDropOff();
    expect(component.dropOffControls.length).toBe(3);

    // Attempting to add 4th should not increase past 3
    component.addDropOff();
    expect(component.dropOffControls.length).toBe(3);
  });

  it('should invalidate form if the same location is selected more than once', () => {
    component.tripForm.patchValue({
      pickupLocationId: 'A',
    });
    component.dropOffControls[0].setValue('A'); // Duplicate location!
    component.tripForm.updateValueAndValidity();

    expect(component.tripForm.errors?.['duplicateLocations']).toBeDefined();
    expect(component.tripForm.valid).toBeFalse();
  });

  it('should invalidate form if cargo weight exceeds combined truck capacity', () => {
    // 1 Medium truck has 3.0 tonnes capacity
    component.tripForm.patchValue({
      pickupLocationId: 'A',
      truckCategoryId: 'medium',
      truckCount: 1,
      cargoWeightTonnes: 3.5, // 3.5 > 3.0!
    });
    component.dropOffControls[0].setValue('B');
    component.tripForm.updateValueAndValidity();

    expect(component.tripForm.errors?.['exceedsCapacity']).toBeDefined();
    expect(component.tripForm.valid).toBeFalse();
  });
});
