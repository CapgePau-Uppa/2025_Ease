/**
 * @file auth.guard.ts
 * @brief Authentication and role guard for protecting routes.
 * 
 * This guard restricts access to certain routes based on the user's authentication status and role.
 * If the user is authenticated and has the required role, access is granted; otherwise, they are redirected to the login page.
 */

import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, NavigationEnd, Event } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, map, tap, catchError, of, switchMap, take, combineLatest, timer } from 'rxjs';
import { NotificationService } from '../notification/notification.service';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private previousUrl: string = '/';
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 30000; // 30 secondes entre chaque vérification

  // Liste des routes publiques
  private publicRoutes: string[] = ['/home', '/category', '/contact', '/auth', '/login', '/register', '/searched-prod'];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private location: Location
  ) {
    // Suivre les changements de route pour garder une trace de la page précédente
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.previousUrl = event.url;
      }
    });
  }

  private getRoleFrench(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrateur',
      'superadmin': 'Super Administrateur',
      'user': 'Utilisateur',
      'banned': 'Utilisateur Banni'
    };
    return roleMap[role.toLowerCase()] || role;
  }

  private handleAccessDenied(message: string): Observable<boolean> {
    this.notificationService.showError(message);
    // Attendre 2 secondes avant de rediriger
    return timer(2000).pipe(
      map(() => {
        // Si l'URL actuelle n'est pas une route publique, rediriger vers /home
        if (!this.publicRoutes.includes(this.router.url)) {
          this.router.navigate(['/home']);
        }
        return false;
      })
    );
  }

  private shouldRefreshState(): boolean {
    const now = Date.now();
    if (now - this.lastCheck > this.CHECK_INTERVAL) {
      this.lastCheck = now;
      return true;
    }
    return false;
  }

  private handleBannedUser(): Observable<boolean> {
    const message = `Votre compte a été suspendu. Vous pouvez toujours accéder aux fonctionnalités de base du site, mais certaines actions comme l'ajout de produits ou l'accès au tableau de bord sont restreintes. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.`;
    this.notificationService.showWarning(message);
    return timer(2000).pipe(
      map(() => {
        if (!this.publicRoutes.includes(this.router.url)) {
          this.router.navigate(['/home']);
        }
        return false;
      })
    );
  }

  /**
   * @brief Determines if a route can be activated based on authentication status and role.
   * 
   * If the user is authenticated and has the required role, they are granted access; otherwise, they are redirected to the login page.
   * 
   * @returns {Observable<boolean>} An observable that emits `true` if the user is authenticated and has the required role, otherwise `false` with redirection.
   */
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    // Ne rafraîchir l'état que si nécessaire
    const authCheck$ = this.shouldRefreshState()
      ? this.authService.refreshAuthState().pipe(
        catchError(() => of(null))
      )
      : of(null);

    return authCheck$.pipe(
      switchMap(() => {
        return combineLatest([
          this.authService.isAuthenticated().pipe(take(1)),
          this.authService.getUserRole().pipe(take(1))
        ]).pipe(
          tap(([isAuthenticated, role]) => {
            console.log('🔒 État authentification:', { isAuthenticated, role });
          }),
          switchMap(([isAuthenticated, role]) => {
            // Vérifier si la route actuelle est publique
            const isPublicRoute = this.publicRoutes.some(publicRoute =>
              this.router.url.startsWith(publicRoute)
            );

            if (!isAuthenticated) {
              console.log('❌ Non authentifié');
              if (!isPublicRoute) {
                this.notificationService.showWarning(
                  'Veuillez vous connecter pour accéder à cette page'
                );
                this.router.navigate(['/auth']);
              }
              return of(isPublicRoute);
            }

            if (!role) {
              console.log('❌ Token invalide ou expiré');
              this.authService.logout();
              this.notificationService.showWarning(
                'Votre session a expiré. Veuillez vous reconnecter.'
              );
              this.router.navigate(['/auth']);
              return of(false);
            }

            const currentRole = role.toLowerCase();

            // Si l'utilisateur est banni
            if (currentRole === 'banned') {
              console.log('❌ Utilisateur banni tentant d\'accéder à une fonctionnalité protégée');
              // Autoriser l'accès uniquement aux routes publiques
              if (!isPublicRoute) {
                return this.handleBannedUser();
              }
              return of(true);
            }

            const requiredRoles = route.data['roles'] as Array<string>;
            console.log('🎯 Rôles requis:', requiredRoles);

            if (!requiredRoles || requiredRoles.length === 0) {
              return of(true);
            }

            const hasRequiredRole = requiredRoles.some(r => r.toLowerCase() === currentRole);

            console.log('🔍 Vérification des rôles:', {
              currentRole,
              requiredRoles,
              hasRequiredRole
            });

            if (!hasRequiredRole) {
              const requiredRolesFrench = requiredRoles
                .map(r => this.getRoleFrench(r))
                .join(' ou ');

              const message = `Accès refusé : Cette fonctionnalité nécessite le rôle ${requiredRolesFrench}. Votre rôle actuel est ${this.getRoleFrench(currentRole)}.`;

              console.log('❌ Accès refusé:', message);
              return this.handleAccessDenied(message);
            }

            console.log('✅ Accès autorisé');
            return of(true);
          })
        );
      }),
      catchError(error => {
        console.error('🔥 Erreur lors de la vérification des droits:', error);
        this.notificationService.showError('Une erreur est survenue lors de la vérification de vos droits d\'accès');
        return timer(2000).pipe(
          map(() => {
            if (!this.publicRoutes.includes(this.router.url)) {
              this.router.navigate(['/home']);
            }
            return false;
          })
        );
      })
    );
  }
}
