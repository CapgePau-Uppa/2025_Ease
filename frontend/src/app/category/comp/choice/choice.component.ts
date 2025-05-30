import { Component, OnInit } from '@angular/core';
import { NgFor, NgClass, NgStyle, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataCacheService } from '../../../../services/cache/data-cache.service';
import { ApiService } from '../../../../services/api.service';
import { APIUnsplash } from '../../../../services/unsplash/unsplash.service';
import { ApiOpenFoodFacts } from '../../../../services/openFoodFacts/openFoodFacts.service';
import { first } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Product } from '../../../models/product.model';
import { InfoBtnComponent } from '../../../searched-prod/comp/info-btn/info-btn.component';
import { Router } from '@angular/router';

interface Rayon {
  name: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  products: Product[];
}

@Component({
  selector: 'app-choice',
  standalone: true,
  templateUrl: './choice.component.html',
  styleUrl: './choice.component.css',
  imports: [NgFor, NgClass, NgStyle, FormsModule, NgIf, LoadingSpinnerComponent, InfoBtnComponent],
})
export class ChoiceComponent implements OnInit {
  isLoading: boolean = false;
  isLoadingOffProducts: boolean = false; // New loading state for OFF products
  rayons: Rayon[] = []; // Array of rayons
  subCategoriesData: { [key: string]: string[] } = {}; // Object to store subcategories for each category
  rayonsData: { [key: string]: Product[] } = {}; // Object to store products for each rayon
  currentRayon: string | null = null; // Currently selected rayon
  currentSubCategories: string[] = []; // Array of subcategories for the currently selected rayon
  currentSubCategory: string = '';
  searchQuery: string = ''; // The search query entered by the user
  filteredProducts: Product[] = []; // Array of filtered products based on the current subcategory
  infoActive: boolean = false;

  /**
   * Constructor for the ChoiceComponent.
   * @param {DataCacheService} dataCacheService - The service to fetch categories and subcategories.
   * @param {ApiService} apiService - The service to fetch products by category.
   * @param {APIUnsplash} apiUnsplash - The service to fetch product images from Unsplash.
   * @param {ApiOpenFoodFacts} apiOpenFoodFacts - The service to fetch product information from Open Food Facts.
   * @param {Router} router - The router service for navigation.
   */
  constructor(
    private dataCacheService: DataCacheService,
    private apiService: ApiService,
    private apiUnsplash: APIUnsplash,
    private apiOpenFoodFacts: ApiOpenFoodFacts,
    private router: Router
  ) {}

  /**
   * Lifecycle hook that is called when the component is initialized.
   */
  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Loads the categories from the data cache service.
   */ 
  private loadCategories(): void {
    this.dataCacheService
      .getCategories()
      .pipe(first())
      .subscribe((categories) => {
        this.rayons = categories.map((category) => ({
          name: this.translateCategoryName(category.name),
          icon: this.getCategoryIcon(this.translateCategoryName(category.name)),
          backgroundColor: this.getCategoryColor(
            this.translateCategoryName(category.name)
          ),
          textColor: '#FFFFFF',
          products: [],
        }));

        // Initialize subcategories for each category
        categories.forEach((category) => {
          this.subCategoriesData[this.translateCategoryName(category.name)] =
            category.subcategories?.map((sub: string) =>
              this.translateSubcategoryName(sub)
            ) || [];
        });
      });
  }

  // TODO: find an API to do it dynamically
  /**
   * Translates the category name to French.
   * @param {string} name - The name of the category to translate.
   * @returns {string} The translated category name.
   */
  private translateCategoryName(name: string): string {
    const translations: { [key: string]: string } = {
      Beverages: 'Boissons',
      Electronics: 'Électronique',
      Fashion: 'Mode',
      Food: 'Alimentation',
      'Health & Fitness': 'Santé et Bien-être',
      Home: 'Maison',
      Sports: 'Sport',
    };
    return translations[name] || name;
  }

  // TODO: find an API to do it dynamically
  /**
   * Translates the subcategory name to French.
   * @param {string} name - The name of the subcategory to translate.
   * @returns {string} The translated subcategory name.
   */
  private translateSubcategoryName(name: string): string {
    const translations: { [key: string]: string } = {
      // Add subcategory translations here
      'Soft Drinks': 'Boissons gazeuses',
      Water: 'Eau',
      Juice: 'Jus',
      Computers: 'Ordinateurs',
      Phones: 'Téléphones',
      Accessories: 'Accessoires',
      Men: 'Homme',
      Women: 'Femme',
      Children: 'Enfants',
      Fruits: 'Fruits',
      Vegetables: 'Légumes',
      Meat: 'Viande',
      Fish: 'Poisson',
      Exercise: 'Exercice',
      Wellness: 'Bien-être',
      Vitamins: 'Vitamines',
      Furniture: 'Meubles',
      Decor: 'Décoration',
      Kitchen: 'Cuisine',
      Equipment: 'Équipement',
      Clothing: 'Vêtements',
      Footwear: 'Chaussures',
    };
    return translations[name] || name;
  }

  /**
   * Gets the icon for a category.
   * @param {string} categoryName - The name of the category to get the icon for.
   * @returns {string} The icon for the category.
   */
  private getCategoryIcon(categoryName: string): string {
    // Map category names to icons
    const iconMap: { [key: string]: string } = {
      Électronique: '📱',
      Mode: '👕',
      Alimentation: '🍽️',
      'Santé et Bien-être': '💪',
      Maison: '🏠',
      Sport: '⚽',
    };
    return iconMap[categoryName] || '📦';
  }

  /**
   * Gets the color for a category.
   * @param {string} categoryName - The name of the category to get the color for.
   * @returns {string} The color for the category.
   */
  private getCategoryColor(categoryName: string): string {
    // Map category names to distinct modern colors
    const colorMap: { [key: string]: string } = {
      Électronique: '#9747FF', // Purple for electronics
      Mode: '#FF8D85', // Coral pink for fashion
      Alimentation: '#4ECDC4', // Turquoise for food
      'Santé et Bien-être': '#96CEB4', // Sage green for health
      Maison: '#6C88C4', // Steel blue for home
      Sport: '#1CD49D', // Mint green for sports
    };
    return colorMap[categoryName] || '#95A5A6';
  }

  /**
   * Gets the original category name from the translated name.
   * @param {string} translatedName - The translated name of the category.
   * @returns {string} The original category name.
   */
  private getOriginalCategoryName(translatedName: string): string {
    const reverseTranslations: { [key: string]: string } = {
      'Boissons': 'Beverages',
      'Électronique': 'Electronics',
      'Mode': 'Fashion',
      'Alimentation': 'Food',
      'Santé et Bien-être': 'Health & Fitness',
      'Maison': 'Home',
      'Sport': 'Sports'
    };
    return reverseTranslations[translatedName] || translatedName;
  }

  /**
   * Loads product images from Unsplash if the product has no image.
   * @param products The array of products to load images for.
   */
  private loadProductImages(products: Product[]): void {
    products.forEach(product => {
      if (!product.image) {
        this.apiUnsplash.searchPhotos(product.name).subscribe({
          next: (response) => {
            if (response.imageUrl) {
              product.image = response.imageUrl;
            } else {
              console.warn(`🚫 No image found for ${product.name}`);
            }
          },
          error: (err) => {
            console.error(`❌ Error retrieving image for ${product.name}:`, err);
          },
        });
      }
    });
  }

  /**
   * Checks if a category is food-related
   * @param categoryName The name of the category to check
   * @returns boolean indicating if the category is food-related
   */
  private isFoodRelatedCategory(categoryName: string): boolean {
    const foodCategories = ['Food', 'Beverages'];
    return foodCategories.includes(categoryName);
  }

  /**
   * @brief Helper method to handle Open Food Facts products response
   * @param products The products to process
   * @param shouldFilterBeverages Whether to filter out beverages
   */
  private handleOpenFoodFactsResponse(products: any[], shouldFilterBeverages: boolean = false): void {
    let offProducts = products.map(product => this.apiOpenFoodFacts.formatOpenFoodFactsProduct(product));
    
    if (shouldFilterBeverages) {
      offProducts = offProducts.filter(product => {
        const categories = (product?.category || '').toLowerCase();
        const excludedTerms = ['beverage', 'drink', 'water', 'juice', 'soda', 'boisson', 'eau', 'jus'];
        return !excludedTerms.some(term => categories.includes(term));
      });
    }

    // Add OFF products to the existing filtered products
    this.filteredProducts = [...this.filteredProducts, ...offProducts];
    // Load images for the new OFF products
    this.loadProductImages(offProducts);
    this.isLoadingOffProducts = false;
  }

  /**
   * Selects a rayon and updates the current rayon and subcategories.
   * @param {string} rayonName - The name of the rayon to select.
   */
  selectRayon(rayonName: string): void {
    this.currentRayon = rayonName;
    this.currentSubCategories = this.subCategoriesData[rayonName] || [];
    this.currentSubCategory = '';
    this.searchQuery = '';
    this.filteredProducts = [];
    this.isLoading = true;
    this.isLoadingOffProducts = false;
    
    const originalCategoryName = this.getOriginalCategoryName(rayonName);
    
    // First, load products from our database
    this.apiService.getProductByCateg(originalCategoryName).subscribe({
      next: (products: Product[]) => {
        this.filteredProducts = products.filter(product => product.status !== 'add-product');
        // Load images for filtered products
        this.loadProductImages(this.filteredProducts);
        this.isLoading = false;

        // If it's a food-related category, load OFF products in the background
        if (this.isFoodRelatedCategory(originalCategoryName)) {
          this.loadOpenFoodFactsProducts(originalCategoryName);
        }
      },
      error: (error: Error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads products from Open Food Facts in the background
   * @param categoryName The category name to search for
   */
  private loadOpenFoodFactsProducts(categoryName: string): void {
    this.isLoadingOffProducts = true;
    
    if (categoryName === 'Food') {
      // Use the dedicated food products search
      this.apiOpenFoodFacts.searchFoodProducts().subscribe({
        next: (response: any[]) => this.handleOpenFoodFactsResponse(response, true),
        error: (error: Error) => {
          console.error('Error loading food products from Open Food Facts:', error);
          this.isLoadingOffProducts = false;
        }
      });
    } else {
      // For Beverages, use the alternative products endpoint
      const formattedProduct = {
        name: '',
        brand: '',
        category: categoryName,
        tags: [],
        description: ''
      };

      this.apiOpenFoodFacts.postOpenFoodFactsAlternativeProducts(formattedProduct).subscribe({
        next: (response: any[]) => this.handleOpenFoodFactsResponse(response),
        error: (error: Error) => {
          console.error('Error loading products from Open Food Facts:', error);
          this.isLoadingOffProducts = false;
        }
      });
    }
  }

  /**
   * Selects a subcategory and updates the current subcategory.
   * @param {string} subCategory - The name of the subcategory to select.
   */
  selectSubCategory(subCategory: string): void {
    this.isLoading = true;
    this.currentSubCategory = subCategory;
    this.filterProducts();
    this.isLoading = false;
  }

  /**
   * Filters the products based on the current subcategory and search query.
   */
  filterProducts(): void {
    console.log('RayonsData:', this.rayonsData);  
    if (!this.currentSubCategory) {
      this.filteredProducts = [];
      return;
    }
    this.isLoading = true;
    // Get products for the current subcategory and filter out 'add-product' status
    const products = this.rayonsData[this.currentSubCategory] || [];
    this.filteredProducts = products.filter(product => product.status !== 'add-product');
    // Load images for filtered products
    this.loadProductImages(this.filteredProducts);
    // Apply search filter if there's a search query
    if (this.searchQuery) {
      this.searchProducts();
    }
    this.isLoading = false;
  }

  /**
   * Filters the products based on the search query.
   * This function filters the already loaded products without making new API calls.
   */
  searchProducts(): void {
    if (!this.searchQuery.trim()) {
      // If search query is empty, show all products
      return;
    }

    const searchTerm = this.searchQuery.toLowerCase().trim();
    this.filteredProducts = this.filteredProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Handles the subcategory selection event
   * @param subCategory The selected subcategory
   */
  onSubCategorySelect(subCategory: string) {
    this.isLoading = true;
    this.currentSubCategory = subCategory;
    this.filterProducts();
    this.isLoading = false;
  }

  /**
   * @brief Navigates to the selected product's page.
   * @param product The selected product object.
   */
  goToInfoProduct(product: any) {
    if (product?.id) {
      const source = product.source || 'Internal';
      this.router
        .navigate([`/product-page/${product.id}/${source}`])
        .catch((error) => {
          console.error('❌ Navigation error:', error);
        });
    } else {
      console.warn('⚠️ Invalid product or missing ID');
    }
  }
}
