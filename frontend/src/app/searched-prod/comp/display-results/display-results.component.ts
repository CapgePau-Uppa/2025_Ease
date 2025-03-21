/**
 * @file display-results.component.ts
 * @brief Component for displaying product search results with optional images and view modes.
 * 
 * This component displays a list or grid of products with support for:
 * - Loading product images from the Unsplash API if not already provided.
 * - Switching between list and grid views.
 * - Navigating to the product details page.
 * 
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APIUnsplash } from '../../../../services/unsplash/unsplash.service';
import { LikeBtnComponent } from '../like-btn/like-btn.component';
/**
 * @class DisplayResultsComponent
 * @brief Handles displaying search results with dynamic images and view mode toggling.
 * 
 * This component:
 * - Loads product search results from the navigation state.
 * - Fetches images from Unsplash for products lacking images.
 * - Provides view toggling between list and grid displays.
 */
@Component({
  selector: 'app-display-results',
  standalone: true,
  imports: [CommonModule, LikeBtnComponent],
  templateUrl: './display-results.component.html',
  styleUrls: ['./display-results.component.css'],
})
export class DisplayResultsComponent implements OnInit {
  resultsArray: any[] = []; // Array of product results to display.
  viewMode: 'list' | 'grid' = 'list'; // View mode state: 'list' (default) or 'grid'.

  /**
   * @constructor
   * @param router Angular router for navigation.
   * @param unsplashService Service for fetching images from Unsplash.
   */
  constructor(
    private router: Router,
    private APIUnsplash: APIUnsplash
  ) { }

  /**
   * @brief Initializes the component and loads product results.
   * 
   * - Retrieves the product array from the navigation state.
   * - Fetches images from Unsplash for products without an existing image.
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    this.resultsArray = history.state.resultsArray || [];

    this.resultsArray.forEach(product => {
      if (!product?.image && product?.name) {
        this.APIUnsplash.searchPhotos(product.name).subscribe({
          next: (response) => {
            if (response.imageUrl) {
              product.image = response.imageUrl;
            } else {
              console.warn(`🚫 Aucune image trouvée pour ${product.name}`);
            }
          },
          error: (err) => {
            console.error(`❌ Erreur de récupération d'image pour ${product.name}:`, err);
          }
        });
      }
    });
  } 

  /**
   * @brief Sets the display mode for the results view.
   * 
   * @param mode The desired view mode: 'list' or 'grid'.
   */
  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
  }

  /**
   * @brief Navigates to the product detail page.
   * 
   * @param product The product object containing the product ID.
   * @throws {Error} Logs a warning if the product ID is missing.
   */
  goToProduct(product: any): void {
    if (product?.id) {
      this.router.navigate([`/products-alternative/${product.id}/${product.source}`])
        .then(() => console.log(`Navigated to /products-alternative/${product.id}/${product.source}`))
        .catch(error => console.error("❌ Navigation error:", error));
    } else {
      console.warn("⚠️ Invalid product or missing ID");
    }
  }
  // Réception de l'événement "likeToggled" émis par le composant enfant
  onLikeToggled(product: any, liked: boolean): void {
    product.liked = liked;
  }
  /**
   * @brief Tracks products by their ID to optimize rendering in ngFor.
   * 
   * @param index The current index of the item.
   * @param product The product item from the list.
   * @returns The unique product ID.
   */
  trackByProduct(index: number, product: any): any {
    return product.id;
  }
}
