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
    const token = cookieService.get('accessToken');
    if (token) {
      if (!environment.production) {
        console.log('🔑 Adding token to request headers');
      }
      newReq = newReq.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!environment.production) {
        console.log('📤 Request headers set:', newReq.headers.get('Authorization')?.substring(0, 20) + '...');
      }
    } else {
      if (!environment.production) {
        console.log('⚠️ No token available for API request');
      }
    }
  }

  return next(newReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!environment.production) {
        console.log('❌ Request error:', {
          status: error.status,
          url: error.url,
          message: error.message
        });
      }

      if (error.status === 401) {
        if (!environment.production) {
          console.log('🔒 Authentication error detected');
          console.log('🔄 Keeping user on current page despite 401');
        }
      }
      return throwError(() => error);
    })
  );
};  