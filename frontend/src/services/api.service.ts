/**
 * @file api.service.ts
 * @brief Angular service for interacting with the backend API.
 *
 * This service provides methods to make HTTP requests to the backend NestJS API
 * using `HttpClient` to retrieve and send data.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { tap } from 'rxjs/operators';

/**
 * @class ApiService
 * @brief Service responsible for handling API calls to the backend.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _backendUrl = environment.backendUrl;   // Backend API base URL.
  private _searchUrl = environment.searchUrl;     // Search API base URL.
  private _productsUrl = environment.productsURL; // Products API base URL.
  private _dbUrl = environment.databaseBackendURL;// Database API base URL.

  constructor(private http: HttpClient) { }

  // ======================== GET
  /**
   * @brief Retrieves data from the backend using an HTTP GET request.
   *
   * This method calls the backend API (`GET /data`) to fetch stored data.
   * Returns an `Observable` containing the response.
   *
   * @returns {Observable<any[]>} An `Observable` containing backend data.
   */
  getData(): Observable<any[]> {
    return this.http.get<any[]>(this._backendUrl);
  }

  /**
   * @brief Retrieves product details by ID using an HTTP GET request.
   *
   * This method calls the backend API to fetch details of a specific product
   * based on the provided product ID.
   *
   * @param {string} id - The ID of the product to fetch.
   * @returns {Observable<any>} An `Observable` containing the product details.
   */
  getProductById(id: string): Observable<any> {
    return this.http.get<any[]>(`${this._productsUrl}/${id}`);
  }

  /**
    * @brief Retrieves all alternative products for the selected one.
    * @param {string} id - ID of the selected product.
    * @returns {Observable<any>} An `Observable` containing alternative products.
    */
  getAlternativeProducts(id: string): Observable<any> {
    return this.http
      .get<any[]>(`${this._productsUrl}/alternativeProducts/${id}`)
      .pipe(
        catchError((error) => {
          console.error('❌ API Error:', error);
          return throwError(
            () =>
              new Error(
                'Erreur API : Impossible de récupérer les produits alternatifs.'
              )
          );
        })
      );
  }

  /**
   * @function getAllCategories
   * @description
   * This method sends an HTTP GET request to the backend to retrieve all category names from the database.
   * It returns an observable that will emit an array of category names when the request is successful.
   * 
   * @returns {Observable<any[]>} An observable that emits an array of category names.
   */
  getAllCategories(): Observable<any> {
    return this.http.get<any[]>(`${this._dbUrl}/categName`);
  }

  /**
   * @brief Retrieves all brand names from the database.
   * @returns {Observable<any[]>} An `Observable` that emits an array of brand names.
   */
  getAllBrands(): Observable<any> {
    return this.http.get<any[]>(`${this._dbUrl}/brandName`);
  }

  /**
   * @brief Performs a product search on the backend using an HTTP GET request.
   * @param {string} query - The search term entered by the user.
   * @returns {Observable<any[]>} An `Observable` containing the search results.
   */
  searchProducts(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this._searchUrl}?q=${query}`).pipe(
      tap((response) => console.log('🔹 API Response:', response)),
      catchError((error) => {
        console.error('❌ Search API Error:', error);
        return throwError(
          () => new Error("Erreur API : Impossible d'effectuer la recherche.")
        );
      })
    );
  }

  /**
   * Get thje product around a location
   * @param location 
   */
  // TODO
  getProductsAround(location: string): Observable<any> {
    console.log('Location:', location);
    return this.http.get<any[]>(`${this._productsUrl}/location/${location}`);
  }
  // ======================== SEND/POST

  /**
   * @brief Sends data to the backend using an HTTP POST request.
   *
   * This method sends a `payload` to the backend (`POST /data`). It returns
   * an `Observable` containing the server response.
   *
   * @param {any} payload - The data to be sent to the backend.
   * @returns {Observable<any>} An `Observable` containing the server response.
   */
  sendData(payload: any): Observable<any> {
    return this.http.post<any>(this._backendUrl, payload);
  }

  /**
   * @brief Sends search data to the backend via an HTTP POST request.
   *
   * This method sends a `payload` to the backend search endpoint (`POST`).
   * It returns an `Observable` containing the server response.
   *
   * @param {any} payload - The search data to send to the backend.
   * @returns {Observable<any>} An `Observable` containing the server response.
   */
  sendSearchData(payload: any): Observable<any> {
    return this.http.post<any>(this._searchUrl, payload);
  }

  /**
   * @brief Sends a selected product ID to the backend via an HTTP POST request.
   *
   * This method posts the selected product's ID to the backend for processing.
   *
   * @param {object} data - The object containing the product ID.
   * @returns {Observable<any>} An `Observable` containing the server response.
   */
  postProductSelection(data: { productId: string }) {
    return this.http.post(`${this._productsUrl}/select`, data);
  }

  /**
   * @brief Sends a POST request to fetch products based on the provided filters.
   * 
   * This method sends a request to the server to retrieve a list of products based on the filter parameters.
   * It takes the filter criteria as input, sends a POST request to the backend API, and returns the response as an Observable.
   * If an error occurs during the request, it logs the error and throws a new error with a descriptive message.
   * 
   * @param filters The filter criteria for fetching products. This can include various parameters such as category, price, etc.
   * 
   * @returns {Observable<any>} An Observable that emits the response from the server, which should contain the filtered products.
   * 
   * @throws {Error} If there is an issue with the API request, an error is thrown with a message indicating the failure.
   */
  postProductsWithFilters(filters: any): Observable<any> {
    return this.http
      .post<any[]>(`${this._productsUrl}/filteredProducts`, filters)
      .pipe(
        catchError((error) => {
          console.error('❌ API Error:', error);
          return throwError(
            () =>
              new Error(
                'API error: Unable to retrieve filtered products.'
              )
          );
        })
      );
  }

  /**
   * @brief Sends a new product to the backend for addition.
   * @param product The product object to be added.
   * @return Observable<any> Response from the backend.
   */
  postAddProduct(product: any): Observable<any> {
    return this.http.post(`${this._productsUrl}/add`, product);
  }

}
