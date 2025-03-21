import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryComponent } from './history/history.component';
// Services
import { AuthService } from '../../../services/auth/auth.service';
@Component({
  selector: 'app-usercomp',
  imports: [CommonModule, HistoryComponent],
  templateUrl: './usercomp.component.html',
  styleUrl: './usercomp.component.css'
})
export class UsercompComponent implements OnInit {
  activeTab: string = 'Work'; // By default, the “Work” tab is active
  // User management
  isAuthenticated = false; // Tracks user authentication status.
  userRole: string | null = null; // Stores the user role.
  userInfo: any // User's infos

  /**
   * @brief Constructor injecting authentication service.
   * @param[in] authService Service for authentication management.
   */
  constructor(
    private authService: AuthService,
  ) { }

  /**
   * @brief Initializes component, checks authentication, and retrieves user role.
   */
  ngOnInit(): void {
    this.authService.isAuthenticated().subscribe((status) => {
      this.isAuthenticated = status;
    });

    this.authService.getUserRole().subscribe((role) => {
      this.userRole = role;
    });
    // retrieves user info
    this.userInfo = this.authService.getUserInfo();
  }

  // How to change tabs
  changeTab(tabName: string) {
    this.activeTab = tabName;
  }

  // Simulate file upload
  uploadFile(event: any) {
    const file = event.target.files[0];
    if (file) {
      alert(`Fichier "${file.name}" téléchargé avec succès !`);
    }
  }
}
