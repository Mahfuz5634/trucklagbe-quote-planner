import { Component } from '@angular/core';
import { QuotePlannerComponent } from './features/quote-planner/quote-planner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuotePlannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'truck-quote-planner';
}
