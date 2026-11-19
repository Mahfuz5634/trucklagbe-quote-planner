import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { catchError, delay, map, switchMap, tap } from 'rxjs/operators';
import { PricingService } from './pricing.service';
import { QuoteEstimate, QuoteState, TripConfig } from '../models/trip.model';

export interface QuoteRequest {
  id: number;
  trip: TripConfig;
  forcedDelayMs?: number; // Optional: useful for deterministic testing
}

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private readonly pricingService = inject(PricingService);

  // Expose reactive state using Angular 18 Signal
  readonly state = signal<QuoteState>({
    status: 'idle',
    estimate: null,
    errorMessage: null,
    activeRequestId: null,
  });

  private requestCounter = 0;
  private readonly requestSubject$ = new Subject<QuoteRequest>();

  constructor() {
    this.initRequestPipeline();
  }

  /**
   * Initializes the RxJS pipeline with switchMap.
   * `switchMap` cancels any pending in-flight request whenever a new request arrives,
   * completely preventing race conditions and stale quotes.
   */
  private initRequestPipeline(): void {
    this.requestSubject$
      .pipe(
        tap((request) => {
          // Set loading state for the newest request
          this.state.set({
            status: 'loading',
            estimate: null,
            errorMessage: null,
            activeRequestId: request.id,
          });
        }),
        switchMap((request) => {
          return this.simulateAsyncQuote(request).pipe(
            catchError((err) => {
              return of({
                requestId: request.id,
                estimate: null,
                error: err?.message || 'Failed to calculate quote',
              });
            })
          );
        })
      )
      .subscribe((result) => {
        // Only update if this matches the active request ID
        if (result.error) {
          this.state.set({
            status: 'error',
            estimate: null,
            errorMessage: result.error,
            activeRequestId: result.requestId,
          });
        } else if (result.estimate) {
          this.state.set({
            status: 'success',
            estimate: result.estimate,
            errorMessage: null,
            activeRequestId: result.requestId,
          });
        }
      });
  }

  /**
   * Request a new quote. Can be called repeatedly even while a previous quote is pending.
   * @param trip Valid trip configuration
   * @param forcedDelayMs Optional delay in ms (useful for unit tests without waiting real time)
   * @returns requestId
   */
  requestQuote(trip: TripConfig, forcedDelayMs?: number): number {
    const requestId = ++this.requestCounter;
    this.requestSubject$.next({ id: requestId, trip, forcedDelayMs });
    return requestId;
  }

  /**
   * Simulates variable response times between 300ms and 1200ms
   */
  private simulateAsyncQuote(
    request: QuoteRequest
  ): Observable<{ requestId: number; estimate: QuoteEstimate | null; error?: string }> {
    const delayTime =
      request.forcedDelayMs !== undefined
        ? request.forcedDelayMs
        : Math.floor(Math.random() * (1200 - 300 + 1)) + 300;

    return of(request).pipe(
      delay(delayTime),
      map((req) => {
        const estimate = this.pricingService.calculateQuote(req.trip);
        return {
          requestId: req.id,
          estimate,
        };
      })
    );
  }

  /**
   * Invalidate current quote state (e.g. when form inputs are edited, or draft cleared)
   */
  invalidateQuote(): void {
    this.state.set({
      status: 'idle',
      estimate: null,
      errorMessage: null,
      activeRequestId: null,
    });
  }
}
