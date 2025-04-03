import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Services
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth/auth.service';

/**
 * @class LocationDropdownComponent
 * @brief A component for managing location selection and searching for products around a given location.
 */
@Component({
  selector: 'app-location-dropdown',
  standalone: true,
  imports: [FormsModule, CommonModule],
  providers: [],
  templateUrl: './location-dropdown.component.html',
  styleUrls: ['./location-dropdown.component.css']
})
export class LocationDropdownComponent implements OnInit {
  userLocation: string = '';      // Stores the user's input location.
  recentLocations: string[] = []; // List of recently searched locations.
  isLoading: boolean = false;     // Indicates whether a search is in progress.
  isAuthenticated = false;        // Tracks user authentication status.
  userInfo: any;                  // Stores user information.
  userRole: string | null = null; // Stores the user's role.
  canGetLuckyButton: boolean = false;     // Determines whether the "Get Lucky" button is displayed.
  locationDropdownOpen: boolean = false;  // Indicates whether the location dropdown is open.

  // Event emitted when a location is selected.
  @Output() locationSelected = new EventEmitter<string>();
  // Event emitted when the "Get Lucky" button is clicked.
  @Output() luckyClicked = new EventEmitter<void>();

  /**
   * @brief Constructor initializes services.
   * @param apiService API service for fetching product data.
   * @param authService Authentication service for user-related data.
   * @param router Angular router for navigation.
   */
  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * @brief Initializes the component, retrieves user authentication status, role, and recent locations.
   */
  ngOnInit(): void {
    this.authService.isAuthenticated().subscribe((status: boolean) => {
      this.isAuthenticated = status;
    });

    this.authService.getUserRole().subscribe((role: string | null) => {
      this.userRole = role;
      this.canGetLuckyButton = role?.toLowerCase() === 'user' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';
    });

    // Retrieves recent locations from localStorage on startup.
    const savedLocations = localStorage.getItem('recentLocations');
    if (savedLocations) {
      this.recentLocations = JSON.parse(savedLocations);
    }
    // Retrieves user information.
    this.userInfo = this.authService.getUserInfo();
  }

  /**
   * @brief Optional: Can be used to provide dynamic suggestions while typing.
   */
  onLocationChange(): void {
    // Logic for dynamic suggestions can be added here.
  }

  /**
   * @brief Clears the location input field.
   */
  clearLocation(): void {
    this.userLocation = '';
  }

  /**
   * @brief Performs a search based on the specified location.
   * @param address Optional address parameter. If not provided, uses `this.userLocation`.
   * 
   * If the input is valid, adds the location to recent searches, makes an API call,
   * and navigates to the search results page.
   */
  searchByLocation(address?: string): void {
    const locationToSearch = address?.trim() || this.userLocation.trim();

    if (locationToSearch) {
      this.addToRecentLocations(locationToSearch);
      this.isLoading = true;

      this.apiService.getProductsAround(locationToSearch)
        .subscribe({
          next: (response: any[]) => {
            this.isLoading = false;
            // Navigates to the search results page with received data.
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigate(['/searched-prod'], { state: { resultsArray: response } });
            });
            this.locationSelected.emit(locationToSearch);
          },
          error: (error: any) => {
            console.error('Error fetching products:', error);
            this.isLoading = false;
          }
        });
    }
  }

  /**
   * @brief Selects a location from recent searches and triggers a search.
   * @param location The selected location.
   */
  selectLocation(location: string): void {
    this.userLocation = location;
    this.searchByLocation();
  }

  /**
   * @brief Adds a location to the list of recent searches, avoiding duplicates and limiting entries to five.
   * @param location The location to add.
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

  // ======================== DROPDOWN TOGGLING ========================

  /**
   * @brief Toggles the visibility of the location dropdown.
   */
  toggleLocationDropdown(): void {
    this.locationDropdownOpen = !this.locationDropdownOpen;
  }

  /**
   * @brief Retrieves a random product based on the user's country and triggers a location-based search.
   */
  getRandomProduct(): void {
    if (this.userInfo?.address?.country) {
      this.searchByLocation(this.userInfo.address.country);
      this.luckyClicked.emit();
    } else {
      console.warn("No country address found for the user.");
    }
  }
}
