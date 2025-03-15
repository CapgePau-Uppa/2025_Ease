import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import * as VANTA from 'vanta/src/vanta.birds';
import * as THREE from 'three';
// Component
import { SearchbarComponent } from './comp/searchbar/searchbar.component';
import { NavbarComponent } from './comp/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../services/notification/notification.service';
import { Router } from '@angular/router';

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
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('vantaBackground') vantaBackground!: ElementRef;
  isVantaActive: boolean = true;
  isDarkMode: boolean = false;
  isSettingsOpen: boolean = false;
  isProjectInfoOpen: boolean = false;
  private vantaEffect: any;
  private vantaContainer: HTMLElement | null = null;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

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
    // Empêcher le défilement du body quand le panneau est ouvert
    if (this.isProjectInfoOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  scrollToInfoSection() {
    const infoSection = document.querySelector('.info-section');
    if (infoSection) {
      infoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * @brief Vérifie si l'utilisateur est connecté et agit en conséquence
   * 
   * @details
   * Si l'utilisateur est connecté, redirige vers la page d'ajout de produit
   * Sinon, affiche une notification pour inviter à se connecter
   */
  handleActionButtonClick() {
    // Vérifier si l'utilisateur est connecté (exemple avec localStorage)
    const isLoggedIn = localStorage.getItem('user') !== null;

    if (isLoggedIn) {
      // Rediriger vers la page d'ajout de produit
      this.router.navigate(['/add-product']);
    } else {
      // Afficher une notification
      this.notificationService.showWarning('Veuillez vous connecter pour contribuer à notre communauté');

      // Forcer le défilement vers le haut avec plusieurs méthodes
      this.forceScrollToTop();

      // Attendre que le défilement soit terminé avant d'animer le bouton de connexion
      // Délai plus long pour s'assurer que le défilement est terminé
      setTimeout(() => {
        // Animer le bouton de connexion
        this.animateLoginButton();
      }, 600);
    }
  }

  /**
   * @brief Force le défilement vers le haut de la page en utilisant plusieurs méthodes
   * pour garantir la compatibilité avec tous les navigateurs
   */
  private forceScrollToTop(): void {
    // Méthode 1: scrollTo standard avec comportement fluide
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Méthode 2: scrollTo standard (pour les navigateurs qui ne supportent pas behavior)
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);

    // Méthode 3: scroll
    setTimeout(() => {
      window.scroll(0, 0);
    }, 100);

    // Méthode 4: scrollIntoView sur le premier élément
    const firstElement = document.querySelector('.main-section');
    if (firstElement) {
      setTimeout(() => {
        firstElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }

    // Méthode 5: définir directement scrollTop sur body et documentElement
    setTimeout(() => {
      document.body.scrollTop = 0; // Pour Safari
      document.documentElement.scrollTop = 0; // Pour Chrome, Firefox, IE et Opera
    }, 200);
  }

  /**
   * @brief Anime le bouton de connexion pour attirer l'attention
   */
  private animateLoginButton() {
    // Attendre un peu pour s'assurer que le DOM est prêt après le défilement
    setTimeout(() => {
      const loginButton = document.querySelector('.login-button') as HTMLElement;

      if (loginButton) {
        // S'assurer que le bouton est visible
        loginButton.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Attendre que le défilement soit terminé avant d'ajouter les effets visuels
        setTimeout(() => {
          // Ajouter une classe pour l'animation
          loginButton.classList.add('login-button-highlight');

          // Créer un effet de focus visuel
          const rect = loginButton.getBoundingClientRect();
          const spotlight = document.createElement('div');
          spotlight.className = 'login-spotlight';

          // Positionner le spotlight
          spotlight.style.position = 'fixed';
          spotlight.style.top = rect.top + 'px';
          spotlight.style.left = rect.left + 'px';
          spotlight.style.width = rect.width + 'px';
          spotlight.style.height = rect.height + 'px';
          spotlight.style.pointerEvents = 'none';

          // Ajouter une bordure brillante
          spotlight.style.border = '3px solid #2dd096';

          // Ajouter au DOM
          document.body.appendChild(spotlight);

          // Ajouter une flèche pointant vers le bouton
          const arrow = document.createElement('div');
          arrow.className = 'login-arrow';
          arrow.innerHTML = '⬆';
          arrow.style.position = 'fixed';
          arrow.style.top = (rect.bottom + 20) + 'px';
          arrow.style.left = (rect.left + rect.width / 2 - 10) + 'px';
          arrow.style.color = '#2dd096';
          arrow.style.fontSize = '35px';
          arrow.style.fontWeight = 'bold';
          arrow.style.animation = 'bounce 1s infinite';
          arrow.style.zIndex = '1001';
          document.body.appendChild(arrow);

          // Ajouter un texte "Connectez-vous ici" sous la flèche
          const loginText = document.createElement('div');
          loginText.innerHTML = 'Connectez-vous ici';
          loginText.style.position = 'fixed';
          loginText.style.top = (rect.bottom + 60) + 'px';
          loginText.style.left = (rect.left + rect.width / 2 - 60) + 'px';
          loginText.style.color = '#2dd096';
          loginText.style.fontWeight = 'bold';
          loginText.style.fontSize = '14px';
          loginText.style.zIndex = '1001';
          loginText.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.7)';
          document.body.appendChild(loginText);

          // Ajouter un événement de clic sur le spotlight pour rediriger vers le bouton de connexion
          spotlight.style.pointerEvents = 'auto';
          spotlight.style.cursor = 'pointer';
          spotlight.addEventListener('click', () => {
            loginButton.click();
          });

          // Retirer la classe et les éléments après l'animation
          setTimeout(() => {
            loginButton.classList.remove('login-button-highlight');
            if (spotlight.parentNode) {
              document.body.removeChild(spotlight);
            }
            if (arrow.parentNode) {
              document.body.removeChild(arrow);
            }
            if (loginText.parentNode) {
              document.body.removeChild(loginText);
            }
          }, 4000); // Augmenter la durée à 4 secondes pour donner plus de temps à l'utilisateur
        }, 300); // Attendre 300ms après le défilement pour ajouter les effets
      }
    }, 100); // Attendre 100ms pour s'assurer que le DOM est prêt
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
    this.toggleProjectInfo();
    // Autres actions si nécessaire
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
