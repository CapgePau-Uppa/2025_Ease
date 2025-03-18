import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { SearchbarComponent } from '../../../homepage/home/comp/searchbar/searchbar.component';

/**
 * @brief Navbar component for handling navigation, authentication, and user roles.
 * @details Manages the menu state, user authentication, and access permissions based on roles.
 */
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
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
  canAccessDashboard: boolean = false; // Determines if the user can access the dashboard.

  /**
   * @brief Constructor for NavbarComponent.
   * @param authService Service for authentication management.
   * @param router Angular Router service.
   */
  constructor(
    private authService: AuthService,
    public router: Router
  ) { }

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
  logout(): void {
    this.authService.logout().subscribe();
    this.showDropdown = false;
  }

  /**
   * @brief Checks the screen size and updates isMobile accordingly.
   */
  @HostListener('window:resize', ['$event'])
  checkScreenSize() {
    this.isMobile = window.innerWidth <= 850;
  }

  /**
   * @brief Vérifie si le lien admin doit être affiché
   * @returns {boolean} True si le lien admin doit être affiché, false sinon
   */
  isAdminLinkVisible(): boolean {
    return this.canAccessDashboard && !this.router.url.startsWith('/admin');
  }

  /**
   * @brief Initializes the component, checks authentication status, role, and permissions.
   * @details Also retrieves cookies and decodes JWT token for debugging purposes.
   */
  ngOnInit(): void {
    this.authService.isAuthenticated().subscribe((status) => {
      this.isAuthenticated = status;
      console.log("🔐 Authentication Status:", status);
    });

    this.authService.getUserRole().subscribe((role) => {
      this.userRole = role;
      console.log("🔑 User Role:", role);

      // Check permissions based on role
      this.canAddProduct = role?.toLowerCase() === 'user' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';
      this.canAccessDashboard = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';
    });

    this.checkScreenSize();
  }
}
