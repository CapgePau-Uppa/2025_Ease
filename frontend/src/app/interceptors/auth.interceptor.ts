import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../environments/environment';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);

  // Log tous les cookies au début de chaque requête (uniquement en dev)
  if (!environment.production) {
    console.log('🔍 Interceptor - Available cookies:', cookieService.getAll());
  }

  // Détection plus robuste des requêtes API
  const backendUrl = environment.backendUrl || 'http://localhost:3000/data';
  const authBackendUrl = environment.authBackendUrl || 'http://localhost:3000/auth';

  const isApiRequest = req.url.includes(backendUrl) ||
    req.url.includes(authBackendUrl) ||
    req.url.includes('/api') ||
    req.url.includes('localhost:3000');

  if (!environment.production) {
    console.log(`📡 Request to: ${req.url} (isApiRequest: ${isApiRequest})`);
  }

  // Toujours inclure withCredentials pour toutes les requêtes API
  let newReq = req.clone({
    withCredentials: isApiRequest
  });

  // Ajouter le token d'authentification si disponible
  if (isApiRequest) {
    try {
      // Récupérer tous les cookies disponibles
      const allCookies = cookieService.getAll();

      // Tentative de récupération du token
      const token = cookieService.get('accessToken') || cookieService.get('accessToken_backup');

      console.log('🔍 État de l\'authentification:', {
        env: environment.production ? 'production' : 'development',
        cookies: Object.keys(allCookies),
        tokenFound: !!token,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        apiUrl: req.url
      });

      if (token) {
        console.log('🔑 Token trouvé, ajout aux en-têtes');
        newReq = newReq.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        console.log('⚠️ Aucun token trouvé dans les cookies');
        // Ne pas rediriger automatiquement, laisser le composant gérer cela
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération du token:', error);
    }
  }

  return next(newReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('❌ Erreur de requête:', {
        status: error.status,
        url: error.url,
        message: error.message,
        env: environment.production ? 'production' : 'development'
      });

      if (error.status === 401) {
        console.log('🔒 Erreur d\'authentification détectée');
      }
      return throwError(() => error);
    })
  );
};  