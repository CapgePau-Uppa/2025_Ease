import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';

@Component({
  selector: 'app-location-dropdown',
  standalone: true,
  imports: [FormsModule, CommonModule],
  providers: [ApiService],
  templateUrl: './location-dropdown.component.html',
  styleUrls: ['./location-dropdown.component.css']
})
export class LocationDropdownComponent implements OnInit {
  userLocation: string = '';
  recentLocations: string[] = [];
  isLoading: boolean = false;

  @Output() locationSelected = new EventEmitter<string>();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Récupère les localisations récentes depuis le localStorage au démarrage
    const savedLocations = localStorage.getItem('recentLocations');
    if (savedLocations) {
      this.recentLocations = JSON.parse(savedLocations);
    }
  }

  /**
   * Optionnel : peut être utilisé pour ajouter des suggestions dynamiques pendant la saisie.
   */
  onLocationChange(): void {
    // Ajoutez ici la logique pour proposer des suggestions si besoin
  }

  /**
   * Réinitialise le champ de saisie.
   */
  clearLocation(): void {
    this.userLocation = '';
  }

  /**
   * Effectue la recherche par localisation.
   * Si la saisie est valide, ajoute la localisation aux récentes, lance l'appel à l'API,
   * puis navigue vers la page de résultats.
   */
  searchByLocation(): void {
    if (this.userLocation.trim()) {
      this.addToRecentLocations(this.userLocation);
      this.isLoading = true;
      this.apiService.getProductsAround(this.userLocation)
        .subscribe({
          next: (response: any[]) => {
            this.isLoading = false;
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate(['/searched-prod'], { state: { resultsArray: response } });
            });
            this.locationSelected.emit(this.userLocation);
          },
          error: (error: Error) => {
            console.error('Erreur lors de la récupération des produits:', error);
            this.isLoading = false;
          }
        });
    }
  }

  /**
   * Sélectionne une localisation depuis la liste des récentes et déclenche une recherche.
   * @param location La localisation sélectionnée.
   */
  selectLocation(location: string): void {
    this.userLocation = location;
    this.searchByLocation();
  }

  /**
   * Ajoute une localisation aux recherches récentes en évitant les doublons et en limitant à 5 entrées.
   * @param location La localisation à ajouter.
   */
  addToRecentLocations(location: string): void {
    if (!this.recentLocations.includes(location)) {
      if (this.recentLocations.length >= 5) {
        this.recentLocations.pop();
      }
      this.recentLocations.unshift(location);
      localStorage.setItem('recentLocations', JSON.stringify(this.recentLocations));
    }
  }
}
