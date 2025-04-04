/**
 * @file comments.service.ts
 * @brief Angular service for interacting with the backend API to manage comments.
 *
 * This service provides methods to retrieve comments from the backend NestJS API
 * using `HttpClient`.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * @class CommentsService
 * @brief Service responsible for handling API calls related to comments.
 */
@Injectable({
  providedIn: 'root',
})
export class CommentsService {
    /**
     * @property {string} _commentsUrl - The base URL for the comments API.
     * It is dynamically set based on the environment configuration.
     */
    private _commentsUrl = `${environment.globalBackendUrl}/comments`;

    /**
     * @constructor
     * @param {HttpClient} http - Angular HTTP client for making API requests.
     */
    constructor(private http: HttpClient) { }

    /**
     * @brief Retrieves all comments from the backend.
     * @returns {Observable<any>} An observable containing the list of comments.
     */
    getAllComments(): Observable<any> {
        return this.http.get<any[]>(`${this._commentsUrl}/GetAllComments`);
    }
}
