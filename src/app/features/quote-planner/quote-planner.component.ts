import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import {
  AVAILABLE_LOCATIONS,
  LocationId,
  LocationItem,
  TRUCK_CATEGORIES,
  TruckCategoryId,
  TripConfig,
} from '../../core/models/trip.model';
import { QuoteService } from '../../core/services/quote.service';
import { DraftService, DraftData } from '../../core/services/draft.service';
import { TripValidators } from '../../core/validators/trip.validators';

@Component({
  selector: 'app-quote-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './quote-planner.component.html',
  styleUrl: './quote-planner.component.css',
})
export class QuotePlannerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly quoteService = inject(QuoteService);
  private readonly draftService = inject(DraftService);

  readonly availableLocations = AVAILABLE_LOCATIONS;
  readonly truckCategoriesList = Object.values(TRUCK_CATEGORIES);

  tripForm!: FormGroup;
  minDateTimeString: string = '';
  feedbackMessage = signal<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Tracks if inputs changed after a quote was produced
  inputsModifiedSinceQuote = signal<boolean>(false);

  ngOnInit(): void {
    this.updateMinDateTime();
    this.buildForm();
    this.checkAndRestoreDraft();
    this.listenToFormChanges();
  }

  get dropOffControls(): FormControl[] {
    return (this.tripForm.get('dropOffLocations') as FormArray).controls as FormControl[];
  }

  get dropOffFormArray(): FormArray {
    return this.tripForm.get('dropOffLocations') as FormArray;
  }

  private updateMinDateTime(): void {
    const now = new Date();
    // Add 1 minute to ensure strictly future
    now.setMinutes(now.getMinutes() + 1);
    this.minDateTimeString = now.toISOString().slice(0, 16);
  }

  private buildForm(): void {
    this.tripForm = this.fb.group(
      {
        pickupLocationId: [null as LocationId | null, [Validators.required]],
        dropOffLocations: this.fb.array(
          [this.fb.control(null as LocationId | null, [Validators.required])],
          [Validators.required, Validators.minLength(1), Validators.maxLength(3)]
        ),
        truckCategoryId: ['medium' as TruckCategoryId, [Validators.required]],
        truckCount: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
        cargoWeightTonnes: [
          null as number | null,
          [Validators.required, Validators.min(0.01)],
        ],
        pickupDateTime: [
          '',
          [Validators.required, TripValidators.futureDateTime()],
        ],
        loadingAssistance: [false],
        unloadingAssistance: [false],
      },
      {
        validators: [TripValidators.uniqueLocations(), TripValidators.cargoCapacity()],
      }
    );
  }

  private listenToFormChanges(): void {
    this.tripForm.valueChanges.subscribe(() => {
      const state = this.quoteService.state();
      if (state.status === 'success' || state.status === 'loading') {
        this.inputsModifiedSinceQuote.set(true);
      }
    });
  }

  addDropOff(): void {
    if (this.dropOffFormArray.length < 3) {
      this.dropOffFormArray.push(
        this.fb.control(null as LocationId | null, [Validators.required])
      );
      this.tripForm.updateValueAndValidity();
    }
  }

  removeDropOff(index: number): void {
    if (this.dropOffFormArray.length > 1) {
      this.dropOffFormArray.removeAt(index);
      this.tripForm.updateValueAndValidity();
    }
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const controls = this.dropOffFormArray.controls;
    moveItemInArray(controls, event.previousIndex, event.currentIndex);
    this.dropOffFormArray.updateValueAndValidity();
    this.tripForm.updateValueAndValidity();
  }

  // Helper to get total truck capacity based on current selection
  get totalTruckCapacity(): number {
    const categoryId = this.tripForm.get('truckCategoryId')?.value as TruckCategoryId;
    const count = Number(this.tripForm.get('truckCount')?.value) || 1;
    if (!categoryId || !TRUCK_CATEGORIES[categoryId]) return 0;
    return TRUCK_CATEGORIES[categoryId].capacityTonnes * count;
  }

  // Handle Request Quote
  onRequestQuote(): void {
    this.updateMinDateTime();

    // Revalidate pickup time against current local time right at request time
    const pickupDateTimeVal = this.tripForm.get('pickupDateTime')?.value;
    if (pickupDateTimeVal) {
      const selectedTime = new Date(pickupDateTimeVal).getTime();
      if (selectedTime <= Date.now()) {
        this.tripForm.get('pickupDateTime')?.setErrors({
          pastDateTime: 'Pickup date and time must be strictly in the future.',
        });
      }
    }

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.showFeedback('error', 'Please resolve form validation errors before requesting a quote.');
      return;
    }

    const formVal = this.tripForm.value;
    const trip: TripConfig = {
      pickupLocationId: formVal.pickupLocationId,
      dropOffLocationIds: (formVal.dropOffLocations as LocationId[]).filter(Boolean),
      truckCategoryId: formVal.truckCategoryId,
      truckCount: Number(formVal.truckCount),
      cargoWeightTonnes: Number(formVal.cargoWeightTonnes),
      pickupDateTime: formVal.pickupDateTime,
      loadingAssistance: Boolean(formVal.loadingAssistance),
      unloadingAssistance: Boolean(formVal.unloadingAssistance),
    };

    this.inputsModifiedSinceQuote.set(false);
    this.quoteService.requestQuote(trip);
  }

  // Draft Handling
  saveDraft(): void {
    const rawVal = this.tripForm.value;
    const draft: DraftData = {
      pickupLocationId: rawVal.pickupLocationId,
      dropOffLocationIds: (rawVal.dropOffLocations as LocationId[]) || [],
      truckCategoryId: rawVal.truckCategoryId,
      truckCount: rawVal.truckCount ? Number(rawVal.truckCount) : 1,
      cargoWeightTonnes: rawVal.cargoWeightTonnes ? Number(rawVal.cargoWeightTonnes) : null,
      pickupDateTime: rawVal.pickupDateTime || null,
      loadingAssistance: Boolean(rawVal.loadingAssistance),
      unloadingAssistance: Boolean(rawVal.unloadingAssistance),
    };

    const success = this.draftService.saveDraft(draft);
    if (success) {
      this.showFeedback('success', 'Draft saved locally! You can safely refresh or return later.');
    } else {
      this.showFeedback('error', 'Could not save draft to local storage.');
    }
  }

  checkAndRestoreDraft(): void {
    const draft = this.draftService.loadDraft();
    if (!draft) return;

    // Patch form with sanitized draft
    if (draft.pickupLocationId !== undefined) {
      this.tripForm.get('pickupLocationId')?.setValue(draft.pickupLocationId);
    }

    if (draft.dropOffLocationIds && draft.dropOffLocationIds.length > 0) {
      this.dropOffFormArray.clear();
      for (const drop of draft.dropOffLocationIds) {
        this.dropOffFormArray.push(this.fb.control(drop, [Validators.required]));
      }
    }

    if (draft.truckCategoryId) {
      this.tripForm.get('truckCategoryId')?.setValue(draft.truckCategoryId);
    }

    if (draft.truckCount) {
      this.tripForm.get('truckCount')?.setValue(draft.truckCount);
    }

    if (draft.cargoWeightTonnes) {
      this.tripForm.get('cargoWeightTonnes')?.setValue(draft.cargoWeightTonnes);
    }

    // Revalidate restored date against current local time
    if (draft.pickupDateTime) {
      const parsed = new Date(draft.pickupDateTime).getTime();
      if (parsed > Date.now()) {
        this.tripForm.get('pickupDateTime')?.setValue(draft.pickupDateTime);
      } else {
        this.tripForm.get('pickupDateTime')?.setValue('');
      }
    }

    this.tripForm.get('loadingAssistance')?.setValue(Boolean(draft.loadingAssistance));
    this.tripForm.get('unloadingAssistance')?.setValue(Boolean(draft.unloadingAssistance));

    this.tripForm.updateValueAndValidity();
    // Restored draft does NOT make old quote valid
    this.quoteService.invalidateQuote();
    this.inputsModifiedSinceQuote.set(false);

    this.showFeedback('info', 'Restored previously saved draft from local storage.');
  }

  clearDraftAndReset(): void {
    this.draftService.clearDraft();
    this.tripForm.reset({
      pickupLocationId: null,
      truckCategoryId: 'medium',
      truckCount: 1,
      cargoWeightTonnes: null,
      pickupDateTime: '',
      loadingAssistance: false,
      unloadingAssistance: false,
    });

    this.dropOffFormArray.clear();
    this.dropOffFormArray.push(this.fb.control(null, [Validators.required]));
    this.quoteService.invalidateQuote();
    this.inputsModifiedSinceQuote.set(false);
    this.showFeedback('info', 'Draft and form have been cleared.');
  }

  private showFeedback(type: 'success' | 'info' | 'error', text: string): void {
    this.feedbackMessage.set({ type, text });
    setTimeout(() => {
      this.feedbackMessage.set(null);
    }, 4500);
  }

  getLocationName(id: string): string {
    const loc = this.availableLocations.find((l) => l.id === id);
    return loc ? `${loc.name} (${loc.id})` : id;
  }
}
