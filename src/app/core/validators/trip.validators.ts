import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TRUCK_CATEGORIES, TruckCategoryId } from '../models/trip.model';

export class TripValidators {
  /**
   * Validates that all selected locations (pickup + all drop-offs) are unique.
   */
  static uniqueLocations(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const pickupId = control.get('pickupLocationId')?.value;
      const dropOffArray = control.get('dropOffLocations')?.value as (string | null)[] | undefined;

      if (!pickupId && (!dropOffArray || dropOffArray.length === 0)) {
        return null;
      }

      const allLocations: string[] = [];
      if (pickupId) {
        allLocations.push(pickupId);
      }

      if (Array.isArray(dropOffArray)) {
        for (const drop of dropOffArray) {
          if (drop) {
            allLocations.push(drop);
          }
        }
      }

      const uniqueLocations = new Set(allLocations);
      if (uniqueLocations.size !== allLocations.length) {
        return { duplicateLocations: 'Each location in a trip must be unique. A location cannot appear twice.' };
      }

      return null;
    };
  }

  /**
   * Validates that total cargo weight does not exceed the total truck capacity (capacityPerTruck * truckCount).
   */
  static cargoCapacity(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const categoryId = control.get('truckCategoryId')?.value as TruckCategoryId | null;
      const truckCount = Number(control.get('truckCount')?.value) || 1;
      const cargoWeight = Number(control.get('cargoWeightTonnes')?.value);

      if (!categoryId || !cargoWeight || cargoWeight <= 0) {
        return null;
      }

      const category = TRUCK_CATEGORIES[categoryId];
      if (!category) return null;

      const totalCapacity = category.capacityTonnes * truckCount;
      if (cargoWeight > totalCapacity) {
        return {
          exceedsCapacity: {
            entered: cargoWeight,
            maxAllowed: totalCapacity,
            message: `Cargo weight (${cargoWeight} tonnes) exceeds total capacity of ${totalCapacity} tonnes (${truckCount} x ${category.capacityTonnes}t).`,
          },
        };
      }

      return null;
    };
  }

  /**
   * Validates that the pickup date and time is strictly later than the current local date/time.
   */
  static futureDateTime(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const selectedTime = new Date(value).getTime();
      const now = Date.now();

      if (isNaN(selectedTime) || selectedTime <= now) {
        return {
          pastDateTime: 'Pickup date and time must be strictly later than current local time.',
        };
      }

      return null;
    };
  }
}
