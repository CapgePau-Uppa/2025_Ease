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
import { FavoritesService } from '../../../../services/favorites/favorites.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../../services/auth/auth.service';
import { NotificationService } from '../../../../services/notification/notification.service';

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
  isAuthenticated = false; // État d'authentification de l'utilisateur

  /**
   * @constructor
   * @param router Angular router for navigation.
   * @param unsplashService Service for fetching images from Unsplash.
   * @param favoritesService Service pour gérer les favoris
   * @param authService Service pour gérer l'authentification
   * @param notificationService Service pour gérer les notifications
   */
  constructor(
    private router: Router,
    private APIUnsplash: APIUnsplash,
    private favoritesService: FavoritesService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  /**
   * @brief Initializes the component and loads product results.
   * 
   * - Retrieves the product array from the navigation state.
   * - Fetches images from Unsplash for products without an existing image.
   * - Vérifie si les produits sont dans les favoris de l'utilisateur
   * 
   * @returns {void}
   */
  ngOnInit(): void {
    this.resultsArray = history.state.resultsArray || [];

    // Vérifier l'état d'authentification
    this.authService.isAuthenticated().subscribe(isAuth => {
      this.isAuthenticated = isAuth;

      // Si l'utilisateur est authentifié, charger les états de favoris
      if (isAuth) {
        this.loadFavoriteStates();
      }
    });

    // Charger les images des produits
    this.loadProductImages();
  }

  /**
   * @brief Charge les images pour chaque produit qui n'en a pas
   */
  private loadProductImages(): void {
    this.resultsArray.forEach(product => {
      if (!product?.image && product?.name) {
        this.APIUnsplash.searchPhotos(product.name).subscribe({
          next: (response) => {
            if (response.imageUrl) {
              product.image = response.imageUrl;
            } else {
              // Ne pas définir d'image par défaut qui n'existe pas
              product.image = null;
            }
          },
          error: (err) => {
            // Ne pas définir d'image par défaut qui n'existe pas
            product.image = null;
          }
        });
      }
    });
  }

  /**
   * @brief Charge l'état des favoris pour tous les produits affichés
   */
  private loadFavoriteStates(): void {
    // Désactiver temporairement le chargement automatique des favoris pour éviter l'erreur 500
    // Nous simulerons comme si aucun favori n'était présent initialement
    this.resultsArray.forEach(product => {
      // Par défaut, aucun produit n'est favori
      product.liked = false;
    });

    // Cette partie restera active pour mettre à jour l'UI quand les favoris changent
    this.favoritesService.favoriteProducts$.subscribe(favoriteIds => {
      this.resultsArray.forEach(product => {
        const isLiked = favoriteIds.includes(product.id);
        if (product.liked !== isLiked) {
          product.liked = isLiked;
        }
      });
    });

    // On ne charge pas les favoris pour l'instant à cause de l'erreur 500
    // this.favoritesService.initializeFavorites();
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
      this.router.navigate([`/products-alternative/${product.id}/${product.source}`]);
    }
  }

  /**
   * @brief Gère l'événement de toggle du bouton like
   * @param product Le produit concerné
   */
  onLikeToggled(product: any): void {
    // Vérifier si l'utilisateur est connecté en utilisant la valeur actuelle
    if (!this.isAuthenticated) {
      this.notificationService.showWarning('Veuillez vous connecter pour ajouter des favoris');
      product.liked = false; // Reset le statut visuel
      this.router.navigate(['/login']);
      return;
    }

    // Obtenir l'état actuel si non défini
    if (product.liked === undefined) {
      this.favoritesService.isProductInFavorites(product.id).subscribe(
        isLiked => {
          product.liked = isLiked;
          this.toggleFavoriteState(product);
        },
        error => {
          product.liked = false; // Par défaut, considérer comme non aimé en cas d'erreur
        }
      );
    } else {
      this.toggleFavoriteState(product);
    }
  }

  private toggleFavoriteState(product: any): void {
    if (product.liked) {
      this.favoritesService.removeFromFavorites(product.id).subscribe(
        () => {
          product.liked = false;
        },
        error => {
          if (error.status === 401) {
            this.notificationService.showWarning('Votre session a expiré, veuillez vous reconnecter');
            this.router.navigate(['/login']);
          }
          // Restaurer l'état visuel en cas d'erreur
          product.liked = true;
        }
      );
    } else {
      // Les détails du produit sont automatiquement sauvegardés par le backend
      this.favoritesService.addToFavorites(product.id).subscribe(
        response => {
          product.liked = true;
        },
        error => {
          if (error.status === 401) {
            this.notificationService.showWarning('Votre session a expiré, veuillez vous reconnecter');
            this.router.navigate(['/login']);
          }
          // Restaurer l'état visuel en cas d'erreur
          product.liked = false;
        }
      );
    }
  }

  /**
   * @brief Track function for NgFor to improve performance
   */
  trackByProduct(index: number, product: any): any {
    return product?.id || index;
  }

  /**
   * @brief Gère les erreurs de chargement d'image
   * @param event Événement d'erreur
   */
  handleImageError(event: any): void {
    const img = event.target;
    img.style.display = 'none'; // Cache l'élément img qui a échoué

    // On peut aussi ajouter un fond de couleur à l'élément parent
    const parentDiv = img.parentElement;
    if (parentDiv) {
      parentDiv.style.backgroundColor = '#f0f0f0';

      // Optionnellement, ajouter un texte ou une icône à la place
      const placeholder = document.createElement('div');
      placeholder.style.height = '100%';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.color = '#999';
      placeholder.innerText = '🖼️';
      parentDiv.appendChild(placeholder);
    }
  }
}
