import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import * as VANTA from 'vanta/src/vanta.birds';
import * as THREE from 'three';
// Component
import { SearchbarComponent } from '../../shared/components/searchbar/searchbar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';

/**
 * @class HomeComponent
 * @brief Handles the home page UI, Vanta.js background animation, dark mode, and user settings.
 *
 * @details
 * Features:
 * - Animated birds background via Vanta.js.
 * - Dark mode toggle with class manipulation.
 * - Settings panel for user preferences.
 * - Project information modal with responsive design.
 * - Retrieves and logs the user role from cookies.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SearchbarComponent, NavbarComponent, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  host: {
    'class': 'home-component'
  }
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vantaBackground') vantaBackground!: ElementRef;
  isVantaActive: boolean = true;
  isDarkMode: boolean = false;
  isSettingsOpen: boolean = false;
  isProjectInfoOpen: boolean = false;
  private vantaEffect: any;
  private vantaContainer: HTMLElement | null = null;

  ngAfterViewInit(): void {
    // Attendre que le DOM soit complètement chargé et rendu
    setTimeout(() => {
      // Accéder à l'élément via la référence ViewChild
      this.vantaContainer = this.vantaBackground.nativeElement;

      if (this.isVantaActive && this.vantaContainer) {
        this.initVantaEffect();
      }
    }, 100); // Un court délai pour s'assurer que le DOM est complètement rendu
  }

  /**
   * @brief Initializes the Vanta.js birds effect.
   * 
   * @details
   * Configures various visual parameters such as background color, speed, and bird properties.
   */
  private initVantaEffect(): void {
    // Détruire l'effet existant s'il y en a un
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }

    // S'assurer que le conteneur a les bonnes dimensions
    if (this.vantaContainer) {
      // Forcer le conteneur à prendre toute la hauteur et largeur de la fenêtre
      this.vantaContainer.style.width = '100%';
      this.vantaContainer.style.height = '100vh';
      this.vantaContainer.style.position = 'fixed';
      this.vantaContainer.style.top = '0';
      this.vantaContainer.style.left = '0';
      this.vantaContainer.style.zIndex = '0';
    }

    this.vantaEffect = (VANTA as any).default({
      el: this.vantaContainer,
      THREE: THREE,
      backgroundColor: 0x023436,
      color1: 0xff0000,
      color2: 0xd1ff,
      birdSize: 1.20,
      wingSpan: 27.00,
      speedLimit: 2.00,
      separation: 62.00,
      cohesion: 79.00,
      quantity: 4.00,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: window.innerHeight,
      minWidth: window.innerWidth,
      scale: 1.00
    });

    // Ajouter un gestionnaire de redimensionnement pour s'assurer que l'animation s'adapte
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * @brief Handles window resize events to update the Vanta effect dimensions.
   */
  private handleResize(): void {
    if (this.vantaEffect) {
      this.vantaEffect.resize();
    }
  }

  /**
   * @brief Toggles the Vanta.js effect on or off.
   * 
   * @details
   * - If active, destroys the effect.
   * - If inactive, reinitializes the animation.
   */
  toggleVantaEffect(): void {
    this.isVantaActive = !this.isVantaActive;

    if (this.isVantaActive) {
      this.initVantaEffect();
    } else if (this.vantaEffect) {
      this.vantaEffect.destroy();
      this.vantaEffect = null;
    }
  }

  /**
   * @brief Toggles the dark mode theme.
   * 
   * @details
   * Adds or removes the `dark-mode` class from the document body to switch themes.
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  /**
   * @brief Toggles the visibility of the settings panel.
   * 
   * @details
   * Updates the `isSettingsOpen` flag to show or hide user settings.
   */
  toggleSettingsPanel(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  /**
   * @brief Toggles the visibility of the project information panel.
   * 
   * @details
   * Updates the `isProjectInfoOpen` flag to show or hide the project information.
   * Prevents scrolling of the background when the panel is open.
   * Ajoute des animations fluides pour l'apparition des cartes.
   */
  toggleProjectInfo(): void {
    this.isProjectInfoOpen = !this.isProjectInfoOpen;

    // Si le panel est ouvert, ajouter une classe au body pour empêcher le défilement
    if (this.isProjectInfoOpen) {
      // Ne pas bloquer le défilement de la page principale
      // document.body.style.overflow = 'hidden';

      // Animation améliorée pour les cartes avec un délai progressif
      setTimeout(() => {
        const cards = document.querySelectorAll('.info-card');
        const intro = document.querySelector('.info-intro');
        const footer = document.querySelector('.info-footer');

        // Animation de l'intro
        if (intro) {
          const introElement = intro as HTMLElement;
          introElement.style.opacity = '0';
          introElement.style.transform = 'translateY(-20px)';
          setTimeout(() => {
            introElement.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            introElement.style.opacity = '1';
            introElement.style.transform = 'translateY(0)';
          }, 200);
        }

        // Animation des cartes avec un effet cascade
        cards.forEach((card, index) => {
          const cardElement = card as HTMLElement;
          cardElement.style.opacity = '0';
          cardElement.style.transform = 'translateY(40px)';
          setTimeout(() => {
            cardElement.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'translateY(0)';
          }, 300 + (index * 150));
        });

        // Animation du footer
        if (footer) {
          const footerElement = footer as HTMLElement;
          footerElement.style.opacity = '0';
          footerElement.style.transform = 'translateY(20px)';
          setTimeout(() => {
            footerElement.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            footerElement.style.opacity = '1';
            footerElement.style.transform = 'translateY(0)';
          }, 300 + (cards.length * 150) + 100);
        }
      }, 300);
    } else {
      // Animation de fermeture
      const panel = document.querySelector('.info-panel');
      if (panel) {
        const panelElement = panel as HTMLElement;
        panelElement.style.transition = 'all 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045)';

        // Sur mobile, faire glisser vers le bas
        if (window.innerWidth <= 480) {
          panelElement.style.transform = 'translateY(100%)';
        } else {
          panelElement.style.opacity = '0';
          panelElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
        }

        // Restaurer le défilement après la fin de l'animation
        setTimeout(() => {
          // S'assurer que le défilement est toujours activé
          document.body.style.overflow = '';

          // Réinitialiser les styles pour permettre une réouverture correcte
          panelElement.style.transition = '';
          if (window.innerWidth <= 480) {
            // Ne pas réinitialiser immédiatement pour éviter un flash visuel
            setTimeout(() => {
              panelElement.style.transform = '';
            }, 50);
          } else {
            panelElement.style.opacity = '';
            panelElement.style.transform = '';
          }
        }, 400);
      } else {
        // S'assurer que le défilement est toujours activé
        document.body.style.overflow = '';
      }
    }
  }

  /**
   * @brief Closes the project information panel and starts the application.
   * 
   * @details
   * Closes the information panel and can trigger additional actions
   * like scrolling to the search section.
   * Ajoute une animation de fermeture fluide.
   */
  startExploring(): void {
    // Animation de fermeture
    const panel = document.querySelector('.info-panel');
    if (panel) {
      const panelElement = panel as HTMLElement;
      panelElement.style.transition = 'all 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045)';

      // Sur mobile, faire glisser vers le bas
      if (window.innerWidth <= 480) {
        panelElement.style.transform = 'translateY(100%)';
      } else {
        panelElement.style.opacity = '0';
        panelElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
      }

      // Mettre à jour l'état et restaurer le défilement après la fin de l'animation
      setTimeout(() => {
        this.isProjectInfoOpen = false;

        // S'assurer que le défilement est toujours activé
        document.body.style.overflow = '';

        // Réinitialiser les styles pour permettre une réouverture correcte
        panelElement.style.transition = '';
        if (window.innerWidth <= 480) {
          // Ne pas réinitialiser immédiatement pour éviter un flash visuel
          setTimeout(() => {
            panelElement.style.transform = '';
          }, 50);
        } else {
          panelElement.style.opacity = '';
          panelElement.style.transform = '';
        }

        // Optionnel : faire défiler jusqu'à la section de recherche
        const searchSection = document.querySelector('.search-container');
        if (searchSection) {
          searchSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 400);
    } else {
      this.isProjectInfoOpen = false;

      // S'assurer que le défilement est toujours activé
      document.body.style.overflow = '';
    }
  }

  /**
   * @brief Lifecycle hook called before the component is destroyed.
   * 
   * @details
   * Destroys the Vanta.js animation effect to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }

    // Supprimer le gestionnaire d'événements de redimensionnement
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Restaurer le défilement du body si nécessaire
    document.body.style.overflow = '';
  }
}
