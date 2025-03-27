/**
 * @file prodpage.component.ts
 * @brief Component for displaying product details.
 *
 * This component retrieves a product ID from the route parameters
 * and fetches the corresponding product details from either an internal API
 * or OpenFoodFacts. If no image is available, it fetches one from Unsplash.
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
// API
import { ApiService } from '../../services/api.service';
import { APIUnsplash } from '../../services/unsplash/unsplash.service';
import { ApiOpenFoodFacts } from '../../services/openFoodFacts/openFoodFacts.service';

/**
 * @class ProdpageComponent
 * @brief Component responsible for displaying product details and handling image retrieval.
 */
@Component({
  selector: 'app-prodpage',
  standalone: true,
  imports: [NavbarComponent, CommonModule],
  templateUrl: './prodpage.component.html',
  styleUrls: ['./prodpage.component.css']
})
export class ProdpageComponent implements OnInit {
  productId: string = '';           // The ID of the selected product.
  productSource: string = '';       // The source of the product (Internal or OpenFoodFacts).
  product: any = null;              // The product details.
  isLoading: boolean = false;       // Loading state flag.
  errorMessage: string = '';        // Error message in case of failure.
  selectedTab: string = 'description'; // Selected tab for displaying product information.

  /**
   * @brief Constructor initializes dependencies.
   * @param route ActivatedRoute to handle route parameters.
   * @param apiService ApiService to fetch internal product details.
   * @param apiUnsplash UnsplashService to fetch product images.
   * @param openFoodFactsService ApiOpenFoodFacts service to fetch external products.
   */
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private apiUnsplash: APIUnsplash,
    private openFoodFactsService: ApiOpenFoodFacts
  ) { }

  /**
   * @brief Lifecycle hook executed when the component is initialized.
   * It retrieves the product ID and source from the route parameters.
   */
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.productId = params.get('id') || '';
      this.productSource = params.get('source') || 'Internal';

      if (this.productId) {
        this.loadProduct(this.productId, this.productSource);
      }
    });
  }

  /**
   * @brief Loads product details based on its source.
   * @param productId The unique identifier of the product.
   * @param productSource The source of the product (Internal or OpenFoodFacts).
   */
  loadProduct(productId: string, productSource: string) {
    this.isLoading = true;
    this.errorMessage = '';
    this.product = null;

    if (productSource === "Internal") {
      this.fetchInternalProduct(productId);
    } else if (productSource === "OpenFoodFacts") {
      this.fetchExternalProduct(productId);
    } else {
      console.warn(`⚠️ Unknown product source: ${productSource}`);
      this.errorMessage = "Unknown product source.";
      this.isLoading = false;
    }
  }

  /**
   * @brief Fetches an internal product.
   * @param productId The ID of the product.
   */
  fetchInternalProduct(productId: string) {
    this.apiService.getProductById(productId).subscribe({
      next: (data) => {
        if (data) {
          this.product = data;
          this.loadProductImage(this.product);
        } else {
          this.errorMessage = 'Product not found.';
        }
      },
      error: () => {
        this.errorMessage = 'Error loading product details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * @brief Fetches a product from OpenFoodFacts.
   * @param productId The ID of the product.
   */
  fetchExternalProduct(productId: string) {
    this.openFoodFactsService.getOpenFoodFactsProductById(productId).subscribe({
      next: (data) => {
        if (data) {
          this.product = this.openFoodFactsService.formatOpenFoodFactsProduct(data);
          this.loadProductImage(this.product);
        } else {
          this.errorMessage = "Product not found on OpenFoodFacts.";
        }
      },
      error: (error) => {
        console.error("❌ Error retrieving product from OpenFoodFacts:", error);
        this.errorMessage = "Unable to fetch product from OpenFoodFacts.";
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * @brief Fetches an image from Unsplash if the product has no image.
   * @param product The product object.
   */
  private loadProductImage(product: any) {
    if (product.imageUrl) {
      return;
    }

    if (product.name) {
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
        }
      });
    }
  }

  /**
   * @brief Updates the selected tab.
   * @param tab The tab to display.
   */
  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  /**
   * @brief Tracks product items for *ngFor to optimize rendering.
   * @param index The index of the product.
   * @param product The product object.
   * @return The unique product ID.
   */
  trackByProduct(index: number, product: any): any {
    return product.id;
  }
}
