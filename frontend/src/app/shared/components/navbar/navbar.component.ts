import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { SearchbarComponent } from '../searchbar/searchbar.component';

/**
 * @brief Navbar component for handling navigation and user interactions.
 * @details Manages authentication status, role-based UI changes, and responsive menu behavior.
 */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, SearchbarComponent],
})
export class NavbarComponent implements OnInit {
  menuOpen = false; // Controls the mobile menu state.
  isAuthenticated = false; // Tracks user authentication status.
  showDropdown = false; // Manages the dropdown menu visibility on desktop.
  isMobile = false; // Detects if the screen is in mobile mode.
  userRole: string | null = null; // Stores the user role.
  canAddProduct: boolean = false; // Determines if the user can add a product.
  isHomePage: boolean = false; // Determines if we're on the home page to hide search bar

  /**
   * @brief Constructor injecting authentication service.
   * @param authService Service for authentication management.
   * @param router Router for navigation and URL checking.
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * @brief Initializes component, checks authentication, and retrieves user role.
   */
  ngOnInit(): void {
    this.authService.isAuthenticated().subscribe((status) => {
      this.isAuthenticated = status;
    });

    this.authService.getUserRole().subscribe((role) => {
      this.userRole = role;
      this.canAddProduct = role?.toLowerCase() === 'user' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';
    });

    // Check if we are on the home page
    this.checkIfHomePage();

    // Subscribe to URL changes to update isHomePage
    this.router.events.subscribe(() => {
      this.checkIfHomePage();
    });

    this.checkScreenSize();
    this.loadFontAwesome();
  }

  /**
   * @brief Checks if the current page is the home page
   */
  private checkIfHomePage(): void {
    const currentUrl = this.router.url;
    this.isHomePage = currentUrl === '/' || currentUrl === '/home';
  }

  /**
   * @brief Toggles the mobile menu state.
   */
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * @brief Toggles the dropdown menu on desktop.
   */
  toggleDropdown() {
    if (!this.isMobile) {
      this.showDropdown = !this.showDropdown;
    }
  }

  /**
   * @brief Logs out the user and closes the dropdown menu.
   */
  logout() {
    this.authService.logout().subscribe();
    this.showDropdown = false;
  }

  /**
   * @brief Checks the screen size and updates isMobile accordingly.
   */
  @HostListener('window:resize', ['$event'])
  checkScreenSize() {
    this.isMobile = window.innerWidth <= 1250;
  }

  /**
   * @brief Loads Font Awesome dynamically if not already included.
   */
  private loadFontAwesome() {
    if (!document.getElementById('font-awesome-css')) {
      const link = document.createElement('link');
      link.id = 'font-awesome-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
      document.head.appendChild(link);
    }
  }
}

