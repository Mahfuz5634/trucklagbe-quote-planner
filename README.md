# Multi-Stop Trip Quote Planner (Truck Lagbe Take-Home Assessment)

A client-side single-page application (SPA) built with **Angular 18**, **TypeScript**, and **Tailwind CSS** that enables users to configure multi-stop logistics trips, reorder drop-offs using drag-and-drop, calculate instant asynchronous fare estimates with race-condition protection, and safely save/restore unfinished drafts locally.

---

## 🛠️ Environment & Prerequisites

* **Node.js**: `v20.x` or `v24.x` (Developed on Node `v24.15.0`)
* **Package Manager**: npm `10.x`+ / `11.x`+
* **Framework**: Angular `18.2.x` (Standalone Components, Signals & Reactive Forms)
* **Styling**: Tailwind CSS
* **Drag and Drop**: `@angular/cdk/drag-drop` (v18.2.x)

---

## 🚀 Setup & Running Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
# or: ng serve
```
Open your browser and navigate to `http://localhost:4200/`.

### 3. Build for Production
```bash
npm run build
```
Production build artifacts will be output to `dist/truck-quote-planner/`.

### 4. Run Automated Unit Tests
```bash
npm test -- --watch=false --browsers=ChromeHeadless
# or for interactive testing in browser:
npm test
```
The project contains **18 automated unit tests** covering business logic, distance and pricing formulas, custom validators, race-condition prevention, and corrupted draft sanitization.

---

## 🧠 Main Technical Decisions & Architecture

### 1. Clear Separation of Concerns
* `src/app/core/models/trip.model.ts`: Domain definitions, TypeScript types/interfaces (`LocationItem`, `TruckCategory`, `TripConfig`, `QuoteEstimate`), symmetric distance matrix lookup, and rate constants.
* `src/app/core/services/pricing.service.ts`: Pure business calculation service implementing distance aggregation, per-truck minimum fares, transport cost, and service add-ons.
* `src/app/core/services/quote.service.ts`: Asynchronous quote orchestration with simulated variable response delay (300ms - 1200ms) and reactive state via Angular 18 Signals.
* `src/app/core/services/draft.service.ts`: Local persistence with defensive schema validation and data sanitization.
* `src/app/core/validators/trip.validators.ts`: Custom Reactive Form validators for location exclusivity, cargo capacity rules, and future pickup timestamps.
* `src/app/features/quote-planner/`: User interface component with CDK Drag-and-Drop, responsive two-column layout, and state feedback.

### 2. Preventing Race Conditions & Stale Estimates (`switchMap`)
* **Requirement**: When users request multiple quotes while previous ones are pending, later requests must never be overwritten by earlier slower responses, and quotes must only reflect current inputs.
* **Solution**: The `QuoteService` pipes request streams through RxJS `switchMap`. When a new quote request arrives, the pending in-flight Observable is automatically cancelled. 
* **Input-State Synchronization**: When any form field is modified after a quote is rendered, an `inputsModifiedSinceQuote` flag flags the display and prompts the user to recalculate.

### 3. Drag-and-Drop Reordering with Angular CDK
* Reordering drop-off locations is powered by `@angular/cdk/drag-drop` rather than simple button nudging.
* The `(cdkDropListDropped)` event reorders the underlying `FormArray` controls with `moveItemInArray()` and updates form validity.

### 4. Defensive Draft Handling (`localStorage`)
* Users can save incomplete or invalid configurations at any time.
* When restoring, `DraftService.sanitizeDraftData()` defensively handles:
  * Malformed JSON (handled with safe try/catch and fallback)
  * Unknown location identifiers (filtered against valid IDs)
  * Duplicate locations (automatically deduplicated)
  * Out-of-range truck counts (clamped between 1 and 5)
  * Expired/past pickup dates (revalidated against `Date.now()`)

---

## 🧪 Verification of Correctness

Correctness was verified through both manual UI testing and comprehensive automated specs:

1. **Official Assessment Test Case**:
   * Pickup A (Baily Road) → Drop B (Shahbagh) → Drop C (Bijoy Sarani)
   * 2 Medium trucks, 5 tonnes cargo, loading assistance only.
   * **Calculated**: Distance = 27 km, Transport = 4,590 BDT, Services = 1,200 BDT, Total = **5,790 BDT** (Matches PDF verification example).
2. **Minimum Fare Enforcement**:
   * Mini truck for 12 km = 600 BDT base, clamped to minimum fare of **1,200 BDT**.
3. **Asynchronous Cancellation Scenario**:
   * Simulated slower request (500ms) superseded by a subsequent fast request (100ms) with `fakeAsync`/`tick`. Verified that the slow request never overwrites the faster latest request.
4. **Draft Sanitization Spec**:
   * Verified corrupted JSON strings and invalid properties are stripped without throwing runtime exceptions.

---

## 🤖 AI Tools Disclosure

* **AI Assistance**: Development was assisted by Google Antigravity / Gemini for project scaffolding, TypeScript domain modeling, unit test creation, and architectural structuring.
* **Review & Verification**: All generated code, formulas, distance matrices, validation rules, and test suites were independently inspected, verified against the assessment PDF requirements, compiled, and executed with 100% test pass rate.
