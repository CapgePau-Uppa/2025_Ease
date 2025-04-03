/**
 * @file searchbar.component.ts
 * @brief Implements a search bar with real-time search, result caching, and filtering capabilities.
 * @details This component provides a search bar with real-time search capabilities, efficient caching of results, 
 * and product selection functionalities. It uses RxJS to debounce user input, manages cached search results to improve 
 * performance, and includes filtering options to refine search queries by country, department, category, and price.
 * It has been modified to handle API errors gracefully and prevent UI crashes.
 * 
 * @author Original Author
 * @date Original Date
 * @modified 2023-XX-XX
 */

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, filter, first } from 'rxjs/operators';
import { Router } from '@angular/router';
// API
import { ApiService } from '../../../../services/api.service';
import { UsersService } from '../../../../services/users/users.service';
import { ApiOpenFoodFacts } from '../../../../services/openFoodFacts/openFoodFacts.service';
// Cache API
import { DataCacheService } from '../../../../services/cache/data-cache.service';
// Import du composant de localisation
import { LocationDropdownComponent } from '../location-dropdown/location-dropdown.component';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    LocationDropdownComponent
  ],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.css'],
})
export class SearchbarComponent implements OnInit {
  // Recherche
  searchQuery: string = '';
  searchResults: any[] = [];
  fullSearchResults: any[] = [];
  noResultsMessage: string = '';
  selectedProduct: string = '';
  wholeSelectedProduct: any;
  isFilterPanelOpen: boolean = false;
  canAddProduct: boolean = false;

  // Filtres
  countries: string[] = [];
  selectedCountry: string = '';
  selectedDepartment: string = '';
  selectedCategory: string = '';
  categories: any[] = [];
  selectedBrand: string = '';
  brands: any[] = [];

  // Filtre Prix
  priceFilter: boolean = false;
  minPrice: number = 0;
  maxPrice: number = 5000;
  appliedFilters: any = {};
  minPriceRange: number = 0;
  maxPriceRange: number = 5000;
  stepPrice: number = 10;

  // Recherche & cache
  private _searchSubject = new Subject<string>();
  private _cache = new Map<string, { data: any[]; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Dropdowns
  filterDropdownOpen: boolean = false;
  locationDropdownOpen: boolean = false;

  isLoading: boolean = false;

  @Output() searchExecuted = new EventEmitter<void>();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private usersService: UsersService,
    private apiOFF: ApiOpenFoodFacts,
    private dataCacheService: DataCacheService,
  ) {
    this._searchSubject
      .pipe(
        debounceTime(200),        // Debounces input to reduce API calls.
        distinctUntilChanged(),   // Prevents repeated queries with the same value.
        filter((query) => query.trim() !== ''), // Ignores empty queries.
        switchMap((query) => {
          const trimmedQuery = query.trim();
          const cachedData = this._cache.get(trimmedQuery);
          // Use cached data if valid
          if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_DURATION) {
            const fullResults = cachedData.data.map((result: any) => ({
              id: result.id,
              name: result.fields?.name || 'Unknown name',
              description: result.fields?.description || 'No description available',
            }));
            this.fullSearchResults = fullResults;
            this.searchResults = fullResults.slice(0, 3);
            this.noResultsMessage = this.searchResults.length ? '' : 'No product found.';
            return of(null);
          }
          this.isLoading = true;  // Display a loading message
          // Launch parallel requests: Internal API + Open Food Facts
          return forkJoin({
            internalResults: this.apiService.sendSearchData({ search: trimmedQuery }),
            offResults: this.apiOFF.getProductInfo(trimmedQuery),
          }).pipe(
            tap(({ internalResults, offResults }) => {
              this.isLoading = false;
              const combinedResults = [
                ...(internalResults || []),
                ...(offResults?.products || []),  // Include Open Food Facts products.
              ];
              if (combinedResults.length) {
                this._cache.set(trimmedQuery, { data: [...combinedResults], timestamp: Date.now() });
              }
            })
          );
        })
      )
      .subscribe({
        /**
         * @brief Processes the results from both APIs and merges them.
         *
         * @param response Object containing results from internal and external APIs.
         * @returns {void}
         */
        next: (response: any) => {
          this.isLoading = false;
          if (response) {
            const internalResults = response.internalResults || [];
            const offResults = response.offResults?.products || [];
            // Merge results with a source identifier
            const combinedResults = [
              ...internalResults.map((result: any) => ({
                id: result.id,
                name: result.fields?.name || 'Unknown name',
                description: result.fields?.description || 'No description available',
                source: 'Internal',
              })),
              ...offResults.map((product: any) => ({
                id: product.code,
                name: product.product_name || 'Unknown product',
                description: product.generic_name || 'No description available',
                source: 'OpenFoodFacts',
              })),
            ];
            this.fullSearchResults = combinedResults;
            this.searchResults = combinedResults.slice(0, 3);
            this.noResultsMessage = this.searchResults.length ? '' : 'No product found.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error during search:', error);
        },
      });
  }

  /**
   * @brief Initializes the component and loads necessary data.
   * @details This method loads the countries, categories, and brands from the cache service and sets up periodic refresh of brands.
   *          It also checks the user role to determine if they are allowed to add products.
   */
  async ngOnInit(): Promise<void> {
    this.dataCacheService.loadData();
    // Fetch the data in the localStorage
    forkJoin({
      countries: this.dataCacheService.getCountries().pipe(first()),
      categories: this.dataCacheService.getCategories().pipe(first()),
      brands: this.dataCacheService.getBrands().pipe(first())
    }).subscribe(({ countries, categories, brands }) => {
      this.countries = countries;
      this.categories = categories.map(category => category.name);
      this.brands = brands;
    });
    // Refresh brands automatically every 10 minutes
    setInterval(() => {
      this.dataCacheService.refreshBrands();
    }, 10 * 60 * 1000);

    const userRole = this.usersService.getUserRole();
    // Check if the role allows you to add a product
    this.canAddProduct = userRole?.toLowerCase() === 'user' || userRole?.toLowerCase() === 'admin';
  }

  get hasSuggestions(): boolean {
    return this.searchResults.length > 0;
  }

  onInputChange(event: any) {
    if (this.searchQuery.trim() === '') {
      this.clearSearch();
      return;
    }
    this._searchSubject.next(this.searchQuery);
  }

  onEnter(event: any) {
    event as KeyboardEvent;
    if (this.searchQuery.trim() !== '' && event.key === 'Enter') {
      if (this.selectedProduct) {
        this.search(true);  // Search including the selected product
      } else {
        if (this.fullSearchResults.length > 0) {
          this.router.navigate(['/searched-prod'], {
            state: { resultsArray: this.fullSearchResults },
          });
        } else {
          this.search(false); // Search without including the selected product
        }
      }
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.noResultsMessage = '';
  }

  selectProduct(product: any) {
    this.searchQuery = product.name;
    this.selectedProduct = product.id;
    this.wholeSelectedProduct = product;
    this.noResultsMessage = '';
    this.searchResults = []; // Hide suggestions after selection.
  }

  search(includeSelectedProduct: boolean = false): void {
    this.applyFilters(); // Apply filters before performing the search.
    // Warn if no filters or selected product is present
    if (!includeSelectedProduct && !Object.keys(this.appliedFilters).length) {
      console.warn('⚠️ No filters applied.');
      return;
    }
    const filtersToSend = {
      ...this.appliedFilters, // Include all applied filters
      productId: includeSelectedProduct ? this.selectedProduct : null, // Include selected product ID if required
      productSource: this.wholeSelectedProduct ? this.wholeSelectedProduct.source : null, // If no id means only the filters
      currentRoute: this.router.url, // Pass the current route for backend context
    };

    this.isLoading = true;

    // Send filters to the API and handle response
    this.apiService.postProductsWithFilters(filtersToSend).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Ensure the selected product is at the first position
        if (includeSelectedProduct && this.selectedProduct) {
          response = this.reorderResults(response, this.selectedProduct);
        }

        // Navigate to results page with the response
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/searched-prod'], { state: { resultsArray: response } });
        });
      },
      error: (error) => console.error('❌ Search error:', error),
    });
  }

  private reorderResults(results: any[], searchedProductId: string): any[] {
    if (!results || results.length === 0) return results;

    const index = results.findIndex(product => product.id === searchedProductId);
    if (index > 0) {
      const [searchedProduct] = results.splice(index, 1);
      results.unshift(searchedProduct);
    }
    return results;
  }


  // ======================== FILTER FUNCTIONS

  onCountryChange() {
    // Optionally, fetch departments based on the selected country.
  }

  updateMinPrice() {
    if (this.minPrice < this.minPriceRange) this.minPrice = this.minPriceRange;
    if (this.minPrice > this.maxPrice) this.maxPrice = this.minPrice;
  }

  updateMaxPrice() {
    if (this.maxPrice > this.maxPriceRange) this.maxPrice = this.maxPriceRange;
    if (this.maxPrice < this.minPrice) this.minPrice = this.maxPrice;
  }

  applyFilters() {
    const filters = {
      country: this.selectedCountry || null,
      department: this.selectedDepartment || null,
      category: this.selectedCategory || null,
      brand: this.selectedBrand || null,
      price: { min: this.minPrice, max: this.maxPrice },
    };

    this.appliedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null && value !== '')
    );
  }


  // ======================== DROPDOWN TOGGLING

  toggleFilterDropdown(): void {
    this.filterDropdownOpen = !this.filterDropdownOpen;
    if (this.filterDropdownOpen) {
      this.locationDropdownOpen = false;
    }
  }

  toggleLocationDropdown(): void {
    this.locationDropdownOpen = !this.locationDropdownOpen;
    if (this.locationDropdownOpen) {
      this.filterDropdownOpen = false;
    }
  }

  handleLocationSelection(selectedLocation: string): void {
    console.log('Location selected:', selectedLocation);
    // Vous pouvez déclencher ici une recherche par localisation ou mettre à jour l'état
    this.locationDropdownOpen = false;
  }
}
