import { Injectable } from '@angular/core';
import {
  AVAILABLE_LOCATIONS,
  LocationId,
  TRUCK_CATEGORIES,
  TruckCategoryId,
} from '../models/trip.model';

export interface DraftData {
  pickupLocationId?: LocationId | null;
  dropOffLocationIds?: LocationId[];
  truckCategoryId?: TruckCategoryId | null;
  truckCount?: number;
  cargoWeightTonnes?: number | null;
  pickupDateTime?: string | null;
  loadingAssistance?: boolean;
  unloadingAssistance?: boolean;
  savedAt?: string;
}

const STORAGE_KEY = 'tl_trip_quote_draft_v1';

@Injectable({
  providedIn: 'root',
})
export class DraftService {
  /**
   * Saves current trip form configuration locally, even if incomplete or invalid.
   */
  saveDraft(data: DraftData): boolean {
    try {
      const payload: DraftData = {
        ...data,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('Failed to save draft to localStorage', err);
      return false;
    }
  }

  /**
   * Loads saved draft and safely validates/sanitizes all fields.
   * Gracefully handles:
   * - Malformed JSON
   * - Wrong data types
   * - Unknown location IDs
   * - Duplicate locations
   * - Out-of-range truck counts (must be 1-5)
   * - Past pickup dates
   */
  loadDraft(): DraftData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return this.sanitizeDraftData(parsed);
    } catch (err) {
      console.warn('Corrupted or invalid draft found in localStorage. Resetting.', err);
      this.clearDraft();
      return null;
    }
  }

  /**
   * Sanitizes any untrusted input from localStorage.
   */
  sanitizeDraftData(raw: any): DraftData {
    const validLocationIds = new Set<string>(AVAILABLE_LOCATIONS.map((l) => l.id));
    const validTruckCategories = new Set<string>(Object.keys(TRUCK_CATEGORIES));

    const sanitized: DraftData = {};

    // 1. Pickup location
    if (typeof raw.pickupLocationId === 'string' && validLocationIds.has(raw.pickupLocationId)) {
      sanitized.pickupLocationId = raw.pickupLocationId as LocationId;
    } else {
      sanitized.pickupLocationId = null;
    }

    // 2. Drop-off locations (1-3 ordered, no duplicates, not equal to pickup)
    const seenLocations = new Set<string>();
    if (sanitized.pickupLocationId) {
      seenLocations.add(sanitized.pickupLocationId);
    }

    const sanitizedDrops: LocationId[] = [];
    if (Array.isArray(raw.dropOffLocationIds)) {
      for (const drop of raw.dropOffLocationIds) {
        if (
          typeof drop === 'string' &&
          validLocationIds.has(drop) &&
          !seenLocations.has(drop) &&
          sanitizedDrops.length < 3
        ) {
          sanitizedDrops.push(drop as LocationId);
          seenLocations.add(drop);
        }
      }
    }
    sanitized.dropOffLocationIds = sanitizedDrops;

    // 3. Truck Category
    if (typeof raw.truckCategoryId === 'string' && validTruckCategories.has(raw.truckCategoryId)) {
      sanitized.truckCategoryId = raw.truckCategoryId as TruckCategoryId;
    } else {
      sanitized.truckCategoryId = null;
    }

    // 4. Truck count (1 to 5)
    if (typeof raw.truckCount === 'number' && Number.isInteger(raw.truckCount)) {
      if (raw.truckCount >= 1 && raw.truckCount <= 5) {
        sanitized.truckCount = raw.truckCount;
      } else {
        // Clamp out of range
        sanitized.truckCount = Math.max(1, Math.min(5, raw.truckCount));
      }
    } else {
      sanitized.truckCount = 1;
    }

    // 5. Cargo weight (must be positive number)
    if (typeof raw.cargoWeightTonnes === 'number' && raw.cargoWeightTonnes > 0) {
      sanitized.cargoWeightTonnes = raw.cargoWeightTonnes;
    } else {
      sanitized.cargoWeightTonnes = null;
    }

    // 6. Pickup date and time (Must be valid future date)
    if (typeof raw.pickupDateTime === 'string') {
      const parsedDate = new Date(raw.pickupDateTime);
      // If date is valid and in the future relative to current local time
      if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now()) {
        sanitized.pickupDateTime = raw.pickupDateTime;
      } else {
        // Date is expired / in the past
        sanitized.pickupDateTime = null;
      }
    } else {
      sanitized.pickupDateTime = null;
    }

    // 7. Boolean assistance options
    sanitized.loadingAssistance = Boolean(raw.loadingAssistance);
    sanitized.unloadingAssistance = Boolean(raw.unloadingAssistance);
    sanitized.savedAt = typeof raw.savedAt === 'string' ? raw.savedAt : undefined;

    return sanitized;
  }

  /**
   * Clears saved draft from localStorage
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear draft from localStorage', err);
    }
  }

  hasDraft(): boolean {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  }
}
