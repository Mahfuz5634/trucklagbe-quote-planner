import { Injectable } from '@angular/core';
import {
  AVAILABLE_LOCATIONS,
  getDistanceBetween,
  LocationId,
  LocationItem,
  QuoteEstimate,
  SERVICE_RATES,
  TRUCK_CATEGORIES,
  TripConfig,
} from '../models/trip.model';

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  /**
   * Calculates the total sequential route distance for Pickup -> Drop 1 -> Drop 2 -> Drop 3.
   * Note: There is NO return leg to the pickup location.
   */
  calculateRouteDistance(pickupId: LocationId, dropIds: LocationId[]): number {
    if (!pickupId || !dropIds || dropIds.length === 0) {
      return 0;
    }

    let totalDistance = 0;
    const fullRoute: LocationId[] = [pickupId, ...dropIds];

    for (let i = 0; i < fullRoute.length - 1; i++) {
      totalDistance += getDistanceBetween(fullRoute[i], fullRoute[i + 1]);
    }

    return totalDistance;
  }

  /**
   * Calculates full quote estimate given a valid TripConfig.
   */
  calculateQuote(trip: TripConfig): QuoteEstimate {
    const truckCategory = TRUCK_CATEGORIES[trip.truckCategoryId];
    if (!truckCategory) {
      throw new Error(`Unknown truck category: ${trip.truckCategoryId}`);
    }

    // 1. distanceKm = sum(consecutiveRouteDistances)
    const distanceKm = this.calculateRouteDistance(
      trip.pickupLocationId,
      trip.dropOffLocationIds
    );

    // 2. farePerTruck = max(distanceKm * ratePerKm, minimumFare)
    const calculatedPerTruckFare = distanceKm * truckCategory.ratePerKm;
    const farePerTruck = Math.max(calculatedPerTruckFare, truckCategory.minimumFare);

    // 3. transportCost = farePerTruck * truckCount
    const transportCost = farePerTruck * trip.truckCount;

    // 4. serviceCost = (selectedServiceFeesPerTruck) * truckCount
    const loadingCost = trip.loadingAssistance
      ? SERVICE_RATES.loadingAssistancePerTruck * trip.truckCount
      : 0;

    const unloadingCost = trip.unloadingAssistance
      ? SERVICE_RATES.unloadingAssistancePerTruck * trip.truckCount
      : 0;

    const serviceCost = loadingCost + unloadingCost;

    // 5. totalQuote = transportCost + serviceCost
    const totalQuote = transportCost + serviceCost;

    // Map location IDs to LocationItem objects for UI display
    const routeIds = [trip.pickupLocationId, ...trip.dropOffLocationIds];
    const routeLocations: LocationItem[] = routeIds.map((id) => {
      const loc = AVAILABLE_LOCATIONS.find((l) => l.id === id);
      return loc ?? { id, name: id };
    });

    return {
      distanceKm,
      ratePerKm: truckCategory.ratePerKm,
      minimumFarePerTruck: truckCategory.minimumFare,
      farePerTruck,
      truckCount: trip.truckCount,
      transportCost,
      loadingCost,
      unloadingCost,
      serviceCost,
      totalQuote,
      routeLocations,
      calculatedForTrip: { ...trip, dropOffLocationIds: [...trip.dropOffLocationIds] },
      calculatedAt: new Date().toISOString(),
    };
  }
}
