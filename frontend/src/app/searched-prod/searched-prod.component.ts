import { Component } from '@angular/core';
// Component
import { DisplayResultsComponent } from './comp/display-results/display-results.component';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
@Component({
  selector: 'app-searched-prod',
  imports: [
    DisplayResultsComponent,
    NavbarComponent,
  ],
  templateUrl: './searched-prod.component.html',
  styleUrl: './searched-prod.component.css'
})
export class SearchedProdComponent {

}