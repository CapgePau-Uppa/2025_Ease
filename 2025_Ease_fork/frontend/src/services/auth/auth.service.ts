/**
 * @file auth.service.ts
 * @brief Authentication service for user management and access control
 * @details This service manages the complete authentication lifecycle, including:
 * - User registration and account creation
 * - Login and session management
 * - Token-based authentication with JWT
 * - Role-based access control
 * - Secure logout and session termination
 * - Authentication state persistence with cookies
 * 
 * The service interacts with the backend API for authentication operations
 * and maintains the authentication state throughout the application.
 * 
 * @author Original Author
 * @date Original Date
 * @modified 2023-XX-XX
 * @version 1.3.0
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, tap, catchError, finalize, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { JwtHelperService } from '@auth0/angular-jwt';
// Cookies
import { CookieService } from 'ngx-cookie-service';
import { NotificationService } from '../notification/notification.service';

/**
 * @interface AuthState
 * @description Represents the authentication state of the application
 * 
 * This interface defines the structure of the authentication state
 * that is maintained and broadcast throughout the application.
 */
interface AuthState {
  /** @property {boolean} isAuthenticated - Whether the user is currently authenticated */
  isAuthenticated: boolean;

  /** @property {string | null} role - The role of the authenticated user, or null if not authenticated */
  role: string | null;
}

/**
 * Interface représentant les données de connexion
 */
interface LoginData {
  email: string;
  password: string;
}

/**
 * @class AuthService
 * @description Service that manages authentication and user sessions
 * 
 * This service provides methods for user authentication, registration,
 * session management, and role-based access control. It maintains the
 * authentication state and broadcasts changes to subscribers.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * @property {string} _authBackendUrl - The base URL for authentication API endpoints
   * @private
   */
  private _authBackendUrl = environment.authBackendUrl;

  /**
   * @property {BehaviorSubject<AuthState>} authState - Subject that broadcasts authentication state changes
   * @private
   */
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    role: null
  });

  /**
   * @property {JwtHelperService} jwtHelper - Service for JWT token operations
   * @private
   */
  private jwtHelper = new JwtHelperService();
  // store user info
  private user: { email: string, role: string, username: string } | null = null;

  /**
   * @constructor
   * @description Initializes the AuthService and checks the initial authentication state
   * 
   * @param {HttpClient} http - The Angular HttpClient for making HTTP requests
   * @param {Router} router - The Angular Router for navigation
   * @param {CookieService} cookieService - Service for managing browser cookies
   * @param {NotificationService} notificationService - Service for showing notifications
   */
  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService,
    private notificationService: NotificationService
  ) {
    // Check initial authentication state on service initialization
    this.checkAuthState();
  }

  /**
   * @method checkAuthState
   * @description Verifies the current authentication state based on stored tokens
   * 
   * This method checks if an access token exists in cookies and, if so,
   * attempts to refresh the authentication state by fetching the user profile.
   * If no token exists, it updates the state to unauthenticated.
   * 
   * @private
   */
  private checkAuthState(): void {
    const token = this.cookieService.get('accessToken');
    if (token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(token);
        const previousRole = this.authState.value.role;
        const newRole = decodedToken.role;

        this.updateAuthState(true, newRole);
        this.user = {
          email: decodedToken.email,
          role: newRole,
          username: decodedToken.username
        };

        // Vérifier si l'utilisateur a été banni ou débanni
        if (previousRole === 'Banned' && newRole !== 'Banned') {
          this.notificationService.showSuccess('Votre compte a été débanni.');
        } else if (previousRole !== 'Banned' && newRole === 'Banned') {
          this.notificationService.showWarning('Votre compte a été banni. Certaines fonctionnalités sont maintenant restreintes.');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        this.logout();
      }
    } else {
      this.updateAuthState(false, null);
    }
  }

  /**
   * @method refreshAuthState
   * @description Refreshes the authentication state by fetching the user profile
   * 
   * This method makes an API call to get the current user's profile and
   * updates the authentication state based on the response. It includes
   * error handling to prevent disrupting the user experience.
   * 
   * @returns {Observable<any>} An observable of the profile API response
   * @public
   */
  public refreshAuthState(): Observable<any> {
    // Vérifier si un token est disponible (cookie ou localStorage)
    const hasToken = this.cookieService.check('accessToken') || !!localStorage.getItem('accessToken');

    if (!hasToken) {
      console.log('⚠️ Aucun token disponible pour rafraîchir l\'état d\'authentification');
      this.updateAuthState(false, null);
      this.user = null;
      return of(null);
    }

    return this.http.get<any>(`${this._authBackendUrl}/profile`, { withCredentials: true })
      .pipe(
        tap(response => {
          console.log('👤 Profile response:', response);
          if (response && response.role) {
            this.updateAuthState(true, response.role);
            this.user = response;
          }
        }),
        catchError(error => {
          console.error('❌ Erreur lors du rafraîchissement de l\'état d\'authentification:', error);
          // En cas d'erreur, mettre à jour l'état d'authentification comme non authentifié
          // mais ne pas rediriger l'utilisateur
          this.updateAuthState(false, null);
          this.user = null;

          // Ne pas supprimer le cookie pour éviter des redirections non désirées
          // Ne pas rediriger vers la page de login

          return throwError(() => error);
        })
      );
  }

  /**
   * @method updateAuthState
   * @description Updates the authentication state and broadcasts changes
   * 
   * This method updates the authentication state only if the values have
   * actually changed, preventing unnecessary broadcasts to subscribers.
   * 
   * @param {boolean} isAuthenticated - Whether the user is authenticated
   * @param {string | null} role - The user's role, or null if not authenticated
   * @private
   */
  private updateAuthState(isAuthenticated: boolean, role: string | null): void {
    console.log('Updating auth state:', { isAuthenticated, role });
    // Only update state if values actually change
    if (this.authState.value.isAuthenticated !== isAuthenticated ||
      this.authState.value.role !== role) {
      this.authState.next({
        isAuthenticated,
        role
      });
    }
  }

  /**
   * @method register
   * @description Registers a new user in the system
   * 
   * This method sends a registration request to the backend with the user's
   * information. Upon successful registration, the user can then log in.
   *
   * @param {string} username - The username for the new account
   * @param {string} email - The email address for the new account
   * @param {string} password - The password for the new account
   * @returns {Observable<any>} An observable of the registration API response
   * @public
   */
  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this._authBackendUrl}/register`, {
      username,
      email,
      password,
    });
  }

  /**
   * @method login
   * @description Authentifie un utilisateur avec les identifiants fournis
   * 
   * Cette méthode envoie une requête POST au backend avec les identifiants
   * de l'utilisateur. En cas de succès, elle met à jour l'état d'authentification
   * et stocke le token dans un cookie et localStorage comme solution de secours.
   * 
   * @param {string} email - L'adresse email de l'utilisateur
   * @param {string} password - Le mot de passe de l'utilisateur
   * @returns {Observable<any>} Un observable de la réponse API de login
   * @public
   */
  public login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this._authBackendUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap(response => {
          console.log('🔑 Login response:', response);

          // Mise à jour de l'état d'authentification
          if (response && response.user && response.user.role) {
            this.updateAuthState(true, response.user.role);
            this.user = response.user;

            // Si le cookie n'est pas correctement défini (problème de cross-domain)
            // stocker également le token dans le localStorage comme fallback
            if (response.access_token) {
              console.log('💾 Sauvegarde du token dans localStorage comme fallback');
              localStorage.setItem('accessToken', response.access_token);
            }

            // Logs de diagnostic
            console.log('🍪 Cookie accessToken présent:', this.cookieService.check('accessToken'));
            console.log('💾 Token dans localStorage:', !!localStorage.getItem('accessToken'));
          }
        }),
        catchError(error => {
          console.error('❌ Erreur de login:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * @method logout
   * @description Logs out the current user
   * 
   * This method sends a POST request to logout the user and clears
   * the authentication state and stored tokens.
   * 
   * @returns {Observable<any>} An observable of the logout API response
   * @public
   */
  public logout(): Observable<any> {
    return this.http.post<any>(`${this._authBackendUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.updateAuthState(false, null);
          this.user = null;

          // Nettoyer tous les emplacements de stockage possibles
          this.cookieService.delete('accessToken', '/');
          localStorage.removeItem('accessToken');

          console.log('🔓 Déconnexion réussie, tokens supprimés');
        }),
        catchError(error => {
          console.error('❌ Erreur lors de la déconnexion:', error);

          // Même en cas d'erreur, nettoyer le stockage local
          this.cookieService.delete('accessToken', '/');
          localStorage.removeItem('accessToken');
          this.updateAuthState(false, null);
          this.user = null;

          return throwError(() => error);
        })
      );
  }

  /**
   * @method isAuthenticated
   * @description Provides an observable of the current authentication status
   * 
   * This method returns an observable that emits the current authentication
   * status and continues to emit when the status changes. It filters out
   * duplicate emissions to prevent unnecessary updates.
   *
   * @returns {Observable<boolean>} An observable emitting true if authenticated, false otherwise
   * @public
   */
  isAuthenticated(): Observable<boolean> {
    return this.authState.pipe(
      map(state => state.isAuthenticated),
      distinctUntilChanged()
    );
  }

  /**
   * @method getAuthStatus
   * @description Alias for isAuthenticated method
   * 
   * This method provides backward compatibility with older code that
   * may use getAuthStatus instead of isAuthenticated.
   *
   * @returns {Observable<boolean>} An observable of the authentication status
   * @public
   */
  getAuthStatus(): Observable<boolean> {
    return this.isAuthenticated();
  }

  /**
   * @method getUserRole
   * @description Provides an observable of the current user's role
   * 
   * This method returns an observable that emits the current user's role
   * and continues to emit when the role changes. It filters out duplicate
   * emissions to prevent unnecessary updates.
   *
   * @returns {Observable<string | null>} An observable of the user's role, or null if not authenticated
   * @public
   */
  getUserRole(): Observable<string | null> {
    return this.authState.pipe(
      map(state => state.role),
      distinctUntilChanged()
    );
  }

  /**
   * @method hasRole
   * @description Checks if the current user has any of the specified roles
   * 
   * This method synchronously checks if the current user's role matches
   * any of the roles provided in the input array.
   *
   * @param {string[]} roles - Array of roles to check against
   * @returns {boolean} True if the user has any of the specified roles, false otherwise
   * @public
   */
  hasRole(roles: string[]): boolean {
    const currentRole = this.authState.value.role;
    return currentRole !== null && roles.includes(currentRole);
  }

  /**
   * Retrieve user information
   * @returns User information
   */
  getUserInfo(): { email: string, role: string, username: string } | null {
    return this.user;
  }
}
