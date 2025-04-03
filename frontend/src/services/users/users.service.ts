/**
 * @file users.service.ts
 * @brief Service for managing user-related operations in Angular.
 *
 * @details
 * The `UsersService` provides methods for retrieving user information from JWT tokens stored in cookies.  
 * It primarily focuses on extracting the user's role for authorization and role-based access control.
 */

import { Injectable } from '@angular/core';
// Handles cookie operations
import { CookieService } from 'ngx-cookie-service';
// Decodes JWT tokens
import { jwtDecode } from 'jwt-decode';

/**
 * @class UsersService
 * @brief Handles user-related operations such as retrieving roles from JWT tokens.
 *
 * @details
 * This service extracts the user role from the JWT stored in the `access_token` cookie.  
 * It is useful for implementing role-based access control (RBAC) within the application.
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {

  /**
   * @brief Constructor injecting required services.
   * @param cookieService Service used to read cookies (specifically the `access_token` cookie).
   */
  constructor(private cookieService: CookieService) { }

  /**
   * @brief Retrieves the user's role from the JWT stored in cookies.
   * 
   * @details
   * - Retrieves the JWT from the `access_token` cookie.
   * - If not found, retrieves the JWT from the `accessToken` cookie.
   * - Decodes the token using `jwtDecode`.
   * - Extracts the `role` field from the decoded payload.
   *
   * @returns {string | null} The user's role (`"admin"`, `"user"`), or `null` if:
   * - The token is not found.
   * - The token is invalid or does not contain a role.
   *
   * @throws {Error} Potentially throws if the token is malformed or the `jwtDecode` function fails.
   */
  getUserRole(): string | null {
    try {
      // Log tous les cookies disponibles pour debug
      const allCookies = this.cookieService.getAll();
      console.log('📝 All available cookies:', allCookies);

      const token = this.cookieService.get('accessToken');
      if (!token) {
        console.log('⚠️ No token found in cookies - checking cookie details');
        // Vérifier spécifiquement le cookie accessToken
        console.log('🔍 Checking accessToken cookie:', {
          exists: this.cookieService.check('accessToken'),
          path: '/',
          domain: window.location.hostname
        });
        return null;
      }

      console.log('🔍 Token found in cookies, decoding...');
      const decoded: any = jwtDecode(token);

      if (!decoded || !decoded.role) {
        console.error('❌ Invalid token structure - no role found');
        this.cookieService.delete('accessToken', '/');
        return null;
      }

      console.log('✅ Token successfully decoded:', {
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString(),
        iat: new Date(decoded.iat * 1000).toISOString()
      });
      return decoded.role;
    } catch (error) {
      console.error('❌ Error processing token:', error);
      this.cookieService.delete('accessToken', '/');
      return null;
    }
  }

  isTokenValid(): boolean {
    try {
      const token = this.cookieService.get('accessToken');
      if (!token) return false;

      const decoded: any = jwtDecode(token);
      if (!decoded || !decoded.exp) return false;

      // Vérifier si le token n'est pas expiré
      const expirationDate = new Date(decoded.exp * 1000);
      const isValid = expirationDate > new Date();

      if (!isValid) {
        console.log('⚠️ Token expired, clearing...');
        this.cookieService.delete('accessToken', '/');
      }

      return isValid;
    } catch {
      return false;
    }
  }

  setToken(token: string): void {
    try {
      this.cookieService.set('accessToken', token, {
        path: '/',
        sameSite: 'Lax',
        secure: false,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      console.log('✅ Token manually set in cookies');
    } catch (error) {
      console.error('❌ Error setting token:', error);
    }
  }

  isAuthenticated(): boolean {
    try {
      const token = this.cookieService.get('accessToken');
      if (!token) {
        console.log('⚠️ No token found during auth check');
        return false;
      }

      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      // Vérifier si le token est valide et non expiré
      if (decoded && decoded.exp && decoded.exp > currentTime) {
        console.log('✅ Valid authentication token found');
        return true;
      }

      console.log('⚠️ Token expired or invalid');
      return false;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  }

  shouldRedirectToLogin(): boolean {
    // Ne pas rediriger si on est déjà sur la page de login ou auth
    if (window.location.pathname.includes('/login') ||
      window.location.pathname.includes('/auth') ||
      window.location.pathname.includes('/register')) {
      return false;
    }

    // Ne pas rediriger lors d'un rechargement si on a un token
    const isPageReload = document.readyState === 'complete';
    if (isPageReload && this.isAuthenticated()) {
      console.log('🔄 Page reload with valid token - staying on current page');
      return false;
    }

    return !this.isAuthenticated();
  }
}
