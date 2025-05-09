﻿/**
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
import { Observable, BehaviorSubject, throwError, of, interval } from 'rxjs';
import { map, tap, catchError, finalize, distinctUntilChanged, switchMap, takeWhile } from 'rxjs/operators';
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
  private _authBackendUrl = environment.authBackendUrl; // The base URL for authentication API endpoints
  /**
   * @property {BehaviorSubject<AuthState>} authState - Subject that broadcasts authentication state changes
   */
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    role: null
  });
  private jwtHelper = new JwtHelperService(); // Service for JWT token operations
  // store user info
  private user: { email: string, role: string, username: string, address: any } | null = null;

  /**
   * @constructor
   * @description Initializes the AuthService and checks the initial authentication state
   * 
   * @param {HttpClient} http - The Angular HttpClient for making HTTP requests
   * @param {Router} router - The Angular Router for navigation
   * @param {²Service} cookieService - Service for managing browser cookies
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

    // Configurer le rafraîchissement périodique de l'état d'authentification
    this.setupPeriodicAuthRefresh();
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
  public checkAuthState(): void {
    // Vérifier le cookie accessToken (maintenant accessible par JavaScript)
    const token = this.cookieService.get('accessToken');
    console.log(`[AuthService] Cookie accessToken present: ${token ? 'Yes' : 'No'}`);

    if (token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(token);
        console.log(`[AuthService] Token décodé:`, {
          email: decodedToken.email,
          role: decodedToken.role,
          exp: new Date(decodedToken.exp * 1000).toLocaleString()
        });

        const previousRole = this.authState.value.role;
        const newRole = decodedToken.role;

        this.updateAuthState(true, newRole);
        this.user = {
          email: decodedToken.email,
          role: newRole,
          username: decodedToken.username,
          address: decodedToken.address
        };

        // Vérifier si l'utilisateur a été banni ou débanni
        if (previousRole === 'Banned' && newRole !== 'Banned') {
          this.notificationService.showSuccess('Votre compte a été débanni.');
        } else if (previousRole !== 'Banned' && newRole === 'Banned') {
          this.notificationService.showWarning('Votre compte a été banni. Certaines fonctionnalités sont maintenant restreintes.');
        }
      } catch (error) {
        console.error('[AuthService] Erreur lors de la vérification de l\'état:', error);
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
    // Vérifier si le cookie d'authentification existe avant de faire la requête
    const accessToken = this.cookieService.get('accessToken');

    if (!accessToken) {
      // Si aucun token, mettre à jour l'état comme non authentifié sans faire de requête
      this.updateAuthState(false, null);
      this.user = null;
      // Retourner un observable qui émet immédiatement pour respecter le contrat
      return of({ authenticated: false });
    }

    // Si un token existe, faire la requête normalement
    return this.http.get<any>(`${this._authBackendUrl}/profile`, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response && response.role) {
            this.updateAuthState(true, response.role);
            this.user = response;
          }
        }),
        catchError(error => {
          // Si l'erreur est 401 (non autorisé), c'est probablement un token expiré - déconnecter l'utilisateur
          if (error.status === 401) {
            this.updateAuthState(false, null);
            this.user = null;
            // Ne pas rediriger vers login pour permettre une reconnexion silencieuse si c'est juste un problème temporaire
          }
          // Pour les erreurs de connexion (comme après un redémarrage du serveur), on ne fait rien immédiatement
          else if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
            console.warn('Le serveur backend est peut-être indisponible temporairement, essai de reconnexion en cours...');
            // On garde l'état d'authentification précédent en attendant que le serveur revienne
          } else {
            // Pour les autres erreurs, consigner et mettre à jour l'état
            console.error('Error refreshing auth state:', error);
            this.updateAuthState(false, null);
            this.user = null;
          }

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
   * @param {string} address - The address for the new account (only post code, city and country)
   * @returns {Observable<any>} An observable of the registration API response
   * @public
   */
  register(username: string, email: string, password: string, address: any): Observable<any> {
    return this.http.post(`${this._authBackendUrl}/register`, {
      username,
      email,
      password,
      address,
    });
  }

  /**
   * @method login
   * @description Authenticates a user and establishes a session
   * 
   * This method sends login credentials to the backend, retrieves a JWT token
   * upon successful authentication, stores it in cookies, and updates the
   * authentication state. The token is stored securely with HTTP-only cookies.
   *
   * @param {string} email - The email address of the user
   * @param {string} password - The user's password
   * @returns {Observable<any>} An observable of the login API response
   * @public
   */
  login(email: string, password: string): Observable<any> {

    return this.http
      .post(`${this._authBackendUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((response: any) => {

          // Vérifier les cookies après connexion
          setTimeout(() => {
            const accessToken = this.cookieService.get('accessToken');
            console.log(`[AuthService] Cookie accessToken: ${accessToken ? 'Présent' : 'Absent'}`);

            const allCookies = this.cookieService.getAll();
            console.log(`[AuthService] Tous les cookies:`, allCookies);

            // Force update auth state
            this.checkAuthState();
          }, 100);

          const decodedToken = this.jwtHelper.decodeToken(response.access_token);
          const previousRole = this.authState.value.role;
          const newRole = decodedToken.role;

          this.updateAuthState(true, newRole);
          this.user = response.user;

          // Check if the user has been banned or unbanned
          if (previousRole === 'Banned' && newRole !== 'Banned') {
            this.notificationService.showSuccess('Votre compte a été débanni. Vous avez maintenant accès à toutes les fonctionnalités.');
          } else if (previousRole !== 'Banned' && newRole === 'Banned') {
            this.notificationService.showWarning('Votre compte a été banni. Certaines fonctionnalités sont maintenant restreintes.');
          }
        })
      );
  }

  /**
   * @method logout
   * @description Terminates the user session and clears authentication data
   * 
   * This method logs out the user by:
   * 1. Immediately updating the authentication state to unauthenticated
   * 2. Removing authentication cookies
   * 3. Sending a logout request to the backend
   * 4. Redirecting to the login page
   *
   * @returns {Observable<any>} An observable of the logout API response
   * @public
   */
  logout(): Observable<any> {
    // Update state immediately
    this.updateAuthState(false, null);

    // Remove cookies
    this.cookieService.delete('accessToken', '/');
    this.cookieService.delete('refreshToken', '/');

    return this.http
      .post(`${this._authBackendUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        finalize(() => {
          this.router.navigate(['/auth']);
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
  getUserInfo(): any | null {
    return this.user ? {
      email: this.user.email,
      role: this.user.role,
      username: this.user.username,
      address: this.user.address
    } : null;
  }

  /**
   * @method updateUserProfile
   * @description Updates the user's profile information
   * 
   * This method sends an update request to the backend with the user's
   * updated information. Upon successful update, the local user object
   * is also updated.
   *
   * @param {any} updateData - The data to update (can include username, password, and/or address)
   * @returns {Observable<any>} An observable of the update API response
   * @public
   */
  updateUserProfile(updateData: any): Observable<any> {
    return this.http.put(`${this._authBackendUrl}/profile/update`, updateData, { withCredentials: true })
      .pipe(
        tap((response: any) => {
          // Mise à jour des informations utilisateur localement
          if (response) {
            if (this.user) {
              // Ne mettre à jour que les champs présents dans la réponse
              if (response.email) this.user.email = response.email;
              if (response.username) this.user.username = response.username;
              if (response.address) this.user.address = response.address;

              // Si le rôle a changé, mettre à jour l'état d'authentification
              if (response.role && response.role !== this.user.role) {
                this.user.role = response.role;
                this.updateAuthState(true, response.role);
              }
            }
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la mise à jour du profil:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * @method setupPeriodicAuthRefresh
   * @description Configure un rafraîchissement périodique de l'état d'authentification
   * 
   * Cette méthode établit un intervalle pour rafraîchir périodiquement l'état d'authentification,
   * ce qui est utile pour maintenir l'état synchronisé avec le backend, notamment après
   * des redémarrages de serveur ou des déconnexions temporaires.
   * 
   * @private
   */
  private setupPeriodicAuthRefresh(): void {
    // Rafraîchir toutes les 2 minutes, mais seulement si l'utilisateur est authentifié
    interval(120000) // 2 minutes
      .pipe(
        // Ne continuer que si l'utilisateur est authentifié
        switchMap(() => this.isAuthenticated()),
        // Seulement si l'utilisateur est authentifié
        takeWhile(isAuth => isAuth, true),
        // Si authentifié, tenter de rafraîchir l'état
        switchMap(isAuth => {
          if (isAuth) {
            // Essayer de rafraîchir silencieusement, sans afficher d'erreurs à l'utilisateur
            return this.refreshAuthState().pipe(
              catchError(err => {
                // En cas d'erreur, consigner mais ne pas perturber l'expérience utilisateur
                return of(null);
              })
            );
          }
          return of(null);
        })
      )
      .subscribe();
  }

}