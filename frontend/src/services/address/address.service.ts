import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * @class ApiAddress
 * @brief Service responsible for handling address validation and completion using OpenStreetMap (Nominatim).
 */
@Injectable({
  providedIn: 'root',
})
export class ApiAddress {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) { }

  /**
   * Fetch address details from OpenStreetMap (Nominatim) based on user input.
   * @param address The address string entered by the user.
   * @returns Observable with formatted address details.
   */
  getAddressDetails(address: string): Observable<any> {
    const params = {
      q: address,
      format: 'json',
      addressdetails: '1', // Enables structured address data in the response
      limit: '1', // Get only the most relevant result
    };

    return this.http.get<any[]>(this.NOMINATIM_URL, { params }).pipe(
      map(response => {
        if (response.length === 0) {
          throw new Error('Adresse introuvable');
        }
        return this.formatAddress(response[0]);
      })
    );
  }

  /**
   * Format the API response into a structured address object.
   * @param data Response from Nominatim API.
   * @returns Formatted address object.
   */
  private formatAddress(data: any) {
    return {
      street: data.address.road || '',
      houseNumber: data.address.house_number || '',
      city: data.address.city || data.address.town || data.address.village || '',
      postcode: data.address.postcode || '',
      country: data.address.country || '',
      lat: data.lat,
      lon: data.lon,
    };
  }

  /**
   * Get address suggestions based on partial input.
   * @param query Partial address input.
   * @returns Observable of address suggestions.
   */
  autocompleteAddress(query: string): Observable<any[]> {
    const params = {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
    };

    return this.http.get<any[]>(this.NOMINATIM_URL, { params }).pipe(
      map(response => response.map(this.formatAddress))
    );
  }

  // TODO
  /**
   * @brief Performs reverse geocoding using OpenStreetMap's Nominatim API.
   * 
   * This method sends an HTTP GET request to the Nominatim API to retrieve 
   * address details based on the provided latitude and longitude. The response 
   * is then transformed into a format compatible with the application.
   * 
   * @param latitude The latitude coordinate of the location.
   * @param longitude The longitude coordinate of the location.
   * @return An Observable containing the transformed address data.
   */
  reverseGeocode(latitude: number, longitude: number) {
    // Endpoint for reverse geocoding with OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    return this.http.get<any>(url).pipe(
      map(response => {
        // Transform the response into the expected format
        return [this.transformNominatimResponse(response)];
      })
    );
  }

  /**
   * @brief Transforms the Nominatim API response into the expected format.
   * 
   * This method extracts relevant address details from the Nominatim API 
   * response and structures them in a format suitable for the application.
   * 
   * @param response The raw response from the Nominatim API.
   * @return An object containing structured address details.
   */
  private transformNominatimResponse(response: any) {
    return {
      street: response.address.road || '',
      houseNumber: response.address.house_number || '',
      postcode: response.address.postcode || '',
      city: response.address.city || response.address.town || response.address.village || '',
      country: response.address.country || ''
      // Additional properties if needed
    };
  }
}
