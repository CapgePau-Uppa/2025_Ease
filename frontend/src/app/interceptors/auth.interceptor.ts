/**
 * @file auth.interceptor.ts
 * @description
 * This file contains an HTTP interceptor that is responsible for adding authentication credentials to outgoing HTTP requests.
 * It checks whether the request is targeting internal API endpoints or external services (like OpenStreetMap).
 * For internal API requests, it adds an authorization token (if available) either from cookies or localStorage.
 * For OpenStreetMap requests, it avoids adding any authentication credentials.
 * The interceptor ensures that cross-site credentials are included where necessary.
 * 
 * It also prevents sending credentials with OpenStreetMap requests and selectively applies the authentication token
 * to API requests that require it.
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../environments/environment';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);

  // Retrieve environment information
  const isLocalhost = window.location.hostname === 'localhost';
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // Check if the request is for the internal API or OpenStreetMap
  const isApiRequest = !req.url.includes('localhost:4200') &&
    (req.url.includes('localhost:3000') ||
      req.url.includes('api') ||
      req.url.includes('render.com'));

  const isOpenStreetMapRequest = req.url.includes('openstreetmap.org') ||
    req.url.includes('nominatim') ||
    req.url.includes('osm');

  // Do not add withCredentials for OpenStreetMap requests
  let newReq;
  if (isOpenStreetMapRequest) {
    // For OpenStreetMap, do not add credentials
    newReq = req.clone();
  } else {
    // For other requests, use withCredentials
    newReq = req.clone({
      withCredentials: true
    });

    // Add the token only for internal API requests
    if (isApiRequest) {
      // Existing code to add the token...
      let token = cookieService.get('accessToken');

      // If the token is not found in cookies, check localStorage
      if (!token && localStorage.getItem('accessToken')) {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
          token = storedToken;
        }
      }

      if (token) {
        newReq = newReq.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }
  }

  return next(newReq);
};
