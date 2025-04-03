/**
 * @file auth.component.ts
 * @brief Component for handling user authentication and address autocompletion.
 */

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
// API
import { AuthService } from '../../services/auth/auth.service';
import { ApiAddress } from '../../services/address/address.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: []
})
export class AuthComponent implements AfterViewInit, OnInit {
  isLoginMode: boolean = true;
  isDarkMode: boolean = false;
  showPassword: boolean = false;
  // User infos
  username: string = '';
  email: string = '';
  password: string = '';
  address: string = '';
  // Autocomplete address
  addressSuggestions: any[] = [];
  private addressInput$ = new Subject<string>();
  selectedAddress: any = null;
  // Error messages
  errorMessage: string = '';
  usernameError: string = '';
  emailError: string = '';
  passwordError: string = '';
  addressError: string | null = null;
  // Real-time validation
  isUsernameValid: boolean = true;
  isEmailValid: boolean = true;
  isPasswordValid: boolean = true;
  isAddressValid: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private apiAddress: ApiAddress,
  ) { }

  @ViewChild('usernameInput', { static: false }) usernameInput!: ElementRef;
  @ViewChild('passwordInput', { static: false }) passwordInput!: ElementRef;
  @ViewChild('emailInput', { static: false }) emailInput!: ElementRef;
  @ViewChild('addressInput', { static: false }) addressInput!: ElementRef;

  /**
   * @brief Initialize the address autocomplete feature
   * This sets up the debounce and distinctUntilChanged operators to manage the address input
   * and trigger the address suggestions when the user types.
   */
  ngOnInit() {
    // Configure debounce for address autocomplete
    this.addressInput$.pipe(
      debounceTime(100),        // Reduces the delay to 100ms for a more responsive experience
      distinctUntilChanged()    // Prevents multiple identical queries
    ).subscribe(query => {
      if (query.length >= 2) {  // Start searching after 2 characters
        this.fetchAddressSuggestions(query);
      } else {
        this.addressSuggestions = [];
      }
    });
    // TODO
    this.getUserLocation();
  }

  /**
   * @brief Initializes event listeners after the view is rendered.
   */
  ngAfterViewInit() {
    this.setupFocusBlurListeners();
    this.setupValidationListeners();
  }

  /**
   * Format the address suggestion for display
   */
  formatSuggestionDisplay(suggestion: any): string {
    const parts = [];

    if (suggestion.houseNumber) parts.push(suggestion.houseNumber);
    if (suggestion.street) parts.push(suggestion.street);
    if (suggestion.postcode) parts.push(suggestion.postcode);
    if (suggestion.city) parts.push(suggestion.city);

    return parts.join(', ');
  }

  /**
   * @brief Switches between login and registration mode.
   */
  setLoginMode(isLogin: boolean): void {
    if (this.isLoginMode !== isLogin) {
      this.isLoginMode = isLogin;

      // Reset fields to prevent input lag on mode switch
      this.email = '';
      this.password = '';
      this.username = '';
      this.address = '';
      this.addressSuggestions = [];
      this.selectedAddress = null;

      // Reset error messages
      this.resetErrors();

      // Reset validation states
      this.isUsernameValid = true;
      this.isEmailValid = true;
      this.isPasswordValid = true;
      this.isAddressValid = true;

      setTimeout(() => {
        this.setupFocusBlurListeners();
        this.setupValidationListeners();
      }, 10);
    }
  }

  /**
   * @brief Resets all error messages.
   */
  resetErrors(): void {
    this.errorMessage = '';
    this.usernameError = '';
    this.emailError = '';
    this.passwordError = '';
    this.addressError = '';
  }

  /**
   * @brief Navigate to the home page.
   */
  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * @brief Adds event listeners to input fields to handle focus and blur styling.
   */
  setupFocusBlurListeners() {
    const inputs = [
      this.usernameInput?.nativeElement,
      this.passwordInput?.nativeElement,
      this.emailInput?.nativeElement,
      this.addressInput?.nativeElement
    ].filter(Boolean);

    inputs.forEach(input => {
      const parentDiv = input.closest('.input-container');

      input.addEventListener('focus', () => {
        parentDiv?.classList.add('focus');

        // If it's the address field, show suggestions again
        if (input.name === 'address' && this.address.length >= 2) {
          this.fetchAddressSuggestions(this.address);
        }
      });

      input.addEventListener('blur', () => {
        if (input.value.trim() === '') {
          parentDiv?.classList.remove('focus');
        }
        if (input.name === 'username') this.validateUsername();
        if (input.name === 'email') this.validateEmail();
        if (input.name === 'password') this.validatePassword();
        if (input.name === 'address') {
          // Give a small delay to allow selection from the suggestion list
          setTimeout(() => {
            this.validateAddress();
            // Don't hide suggestions immediately to allow click
            setTimeout(() => {
              this.addressSuggestions = [];
            }, 200);
          }, 150);
        }
      });
    });
  }

  /**
   * @brief Configure real-time validation event listeners for input fields.
   */
  setupValidationListeners() {
    const inputs = [
      this.usernameInput?.nativeElement,
      this.passwordInput?.nativeElement,
      this.emailInput?.nativeElement,
      this.addressInput?.nativeElement
    ].filter(Boolean);

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.name === 'username') this.validateUsername();
        if (input.name === 'email') this.validateEmail();
        if (input.name === 'password') this.validatePassword();
        // Address validation is handled by onAddressInput
      });
    });
  }

  /**
   * @brief Toggles password visibility.
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * @brief Toggles the application's dark mode.
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  /**
   * @brief Handles form submission for login or registration.
   */
  async onSubmit(form: NgForm): Promise<void> {
    // Validate form inputs
    if (!this.validateForm(form, this.isLoginMode)) {
      return;
    }

    // If the user wants to log in
    if (this.isLoginMode) {
      this.authService.login(this.username, this.password).subscribe({
        next: (response) => {
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error("Login error:", err);
          this.errorMessage = 'Invalid email or password.';
        },
      });
    }

    // If the user wants to create an account
    if (!this.isLoginMode) {
      // If we have a selected address, use it
      if (this.selectedAddress) {
        this.processRegistration();
      } else {
        // Otherwise validate the address they typed
        this.apiAddress.getAddressDetails(this.address).subscribe({
          next: (address) => {
            this.selectedAddress = address;
            // Continue with registration
            this.processRegistration();
          },
          error: (error) => {
            console.error('Validation error :', error.message);
            this.addressError = 'Address not recognized. Please select a suggestion.';
            this.isAddressValid = false;
            const parentDiv = this.addressInput?.nativeElement.closest('.input-container');
            parentDiv?.classList.add('error-input');
          }
        });
      }
    }
  }

  /**
   * Process the registration after address validation
   */
  private processRegistration() {
    // Check data before sending
    if (!this.username || !this.email || !this.password || !this.selectedAddress) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    // Create an address object with only relevant fields
    const address = {
      postCode: this.selectedAddress.postcode,
      city: this.selectedAddress.city,
      country: this.selectedAddress.country
    }

    this.authService.register(this.username, this.email, this.password, address).subscribe({
      next: (response) => {
        // Navigate to the login page
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        console.error("Register error:", err);

        if (err.error && typeof err.error.message === 'string') {
          if (err.error.message.includes('email')) {
            this.emailError = 'This email is already in use';
          } else if (err.error.message.includes('username')) {
            this.usernameError = 'This username is already in use';
          } else {
            this.errorMessage = 'An error has occurred. Please try again.';
          }
        } else {
          this.errorMessage = 'An error has occurred. Please try again.';
        }
      },
    });
  }

  // ===================================================================
  // ========================= ADDRESS FUNCTIONS =======================
  // ===================================================================
  /**
   * Handle address input and trigger the autocomplete
   * 
   * @param event - The input event from the address field
   */
  onAddressInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    // Immediately triggers the search
    this.addressInput$.next(value);

    // Reset selected address when input changes
    this.selectedAddress = null;
  }

  /**
   * Fetch address suggestions from the API.
   * 
   * @param query - The address query entered by the user
   */
  fetchAddressSuggestions(query: string) {
    if (query.trim() === '') {
      this.addressSuggestions = [];
      return;
    }

    this.apiAddress.autocompleteAddress(query).subscribe({
      next: (suggestions) => {
        this.addressSuggestions = suggestions;
      },
      error: (error) => {
        console.error('Error fetching address suggestions:', error);
        this.addressSuggestions = [];
      }
    });
  }

  /**
   * Select an address from suggestions
   */
  selectAddress(suggestion: any) {
    this.selectedAddress = suggestion;
    this.address = this.formatSuggestionDisplay(suggestion);
    this.addressSuggestions = []; // Clear suggestions after selection
    this.validateAddress(); // Validate the selected address
  }

  // ===================================================================
  // ========================= VALIDATE FIELDS =========================
  // ===================================================================
  /**
   * @brief Validates the form fields for login or registration.
   * 
   * @param form - The form data to validate
   * @param isLoginMode - Boolean flag indicating if it's login mode
   * @returns true if the form is valid, otherwise false
   */
  validateForm(form: NgForm, isLoginMode: boolean): boolean {
    // Calls up validation methods that uncover errors
    this.validateUsername();
    this.validateEmail();
    this.validatePassword();
  
    if (!isLoginMode) {
      this.validateAddress();
    }
  
    // Checks if at least one field is invalid
    return this.isUsernameValid && this.isEmailValid && this.isPasswordValid && (isLoginMode || this.isAddressValid);
  }
  
  /**
   * @brief Validates username in real time.
   */
  validateUsername(): void {
    const parentDiv = this.usernameInput?.nativeElement.closest('.input-container');

    if (!this.username || this.username.trim() === '') {
      this.usernameError = this.isLoginMode ? 'Email requis' : 'Nom d\'utilisateur requis';
      this.isUsernameValid = false;
      parentDiv?.classList.add('error-input');
    } else if (this.isLoginMode) {
      // In login mode, the username field is used for the email.
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(this.username)) {
        this.usernameError = 'Format d\'email invalide';
        this.isUsernameValid = false;
        parentDiv?.classList.add('error-input');
      } else {
        this.usernameError = '';
        this.isUsernameValid = true;
        parentDiv?.classList.remove('error-input');
      }
    } else {
      this.usernameError = '';
      this.isUsernameValid = true;
      parentDiv?.classList.remove('error-input');
    }
  }

  /**
   * @brief Validates the email input.
   */
  validateEmail(): void {
    const parentDiv = this.emailInput?.nativeElement.closest('.input-container');

    if (!this.isLoginMode) {
      if (!this.email || this.email.trim() === '') {
        this.emailError = 'Email requis';
        this.isEmailValid = false;
        parentDiv?.classList.add('error-input');
      } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(this.email)) {
          this.emailError = 'Format d\'email invalide';
          this.isEmailValid = false;
          parentDiv?.classList.add('error-input');
        } else {
          this.emailError = '';
          this.isEmailValid = true;
          parentDiv?.classList.remove('error-input');
        }
      }
    }
  }

  /**
   * @brief Validates the password input.
   */
  validatePassword(): void {
    const parentDiv = this.passwordInput?.nativeElement.closest('.input-container');

    if (!this.password || this.password.trim() === '') {
      this.passwordError = 'Mot de passe requis';
      this.isPasswordValid = false;
      parentDiv?.classList.add('error-input');
    } else if (this.password.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères';
      this.isPasswordValid = false;
      parentDiv?.classList.add('error-input');
    } else {
      this.passwordError = '';
      this.isPasswordValid = true;
      parentDiv?.classList.remove('error-input');
    }
  }

  /**
   * @brief Validates the address input.
   */
  validateAddress(): void {
    const parentDiv = this.addressInput?.nativeElement.closest('.input-container');
    if (!this.address || this.address.trim() === '') {
      this.addressError = 'Adresse requise';
      this.isAddressValid = false;
      parentDiv?.classList.add('error-input');
    } else {
      // If an address has been selected in the list, it is already validated.
      if (this.selectedAddress) {
        this.addressError = '';
        this.isAddressValid = true;
        parentDiv?.classList.remove('error-input');
      } else {
        // Otherwise, we keep the very basic validation here
        // Full validation will take place when the form is submitted
        this.addressError = '';
        this.isAddressValid = true;
        parentDiv?.classList.remove('error-input');
      }
    }
  }

  // ===================================================================
  // ========================= LOCATION (BROWSER) ======================
  // ===================================================================
  // TODO
  /**
   * @brief Retrieves the user's current geographic location.
   * 
   * This function checks if the browser supports geolocation and, if so, 
   * requests the user's current position. Upon success, it extracts the latitude 
   * and longitude and calls the reverseGeocode method to fetch address suggestions.
   * If geolocation is not supported or an error occurs, it logs an error message.
   */
  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          // Use these coordinates to find nearby addresses
          this.reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Handle the error (display a message to the user)
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
      // Inform the user that geolocation is not available
    }
  }

  /**
   * @brief Performs a reverse geocoding lookup (coordinates → address).
   * 
   * This method takes a latitude and longitude as input and sends a request 
   * to the API to retrieve a list of possible addresses for these coordinates. 
   * If successful, it updates the addressSuggestions list with the results.
   * 
   * @param latitude The latitude coordinate of the user's location.
   * @param longitude The longitude coordinate of the user's location.
   */
  reverseGeocode(latitude: number, longitude: number) {
    this.apiAddress.reverseGeocode(latitude, longitude).subscribe({
      next: (addresses) => {
        if (addresses && addresses.length > 0) {
          // Display the found addresses as suggestions
          this.addressSuggestions = addresses;
          console.log('User location:', addresses);
        }
      },
      error: (error) => {
        console.error('Reverse geocoding error:', error);
      }
    });
  }
}