import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Dashboard Components
import { StatsComponent } from '../stats/stats.component';
import { ProductRequestsComponent } from '../product-requests/product-requests.component';
import { UsersComponent } from '../users/users.component';
import { UsersService } from '../../../../services/users/users.service';

@Component({
  standalone: true,
  selector: 'app-super-admin-dashboard',
  imports: [StatsComponent, ProductRequestsComponent, UsersComponent, CommonModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css']
})
export class SuperAdminDashboardComponent implements OnInit {
  activeTab: string = 'stats';
  isAuthorized: boolean = false;
  menuOpen: boolean = false; // Pour le menu burger en mode responsive

  constructor(private usersService: UsersService) { }

  ngOnInit(): void {
    const userRole = this.usersService.getUserRole()?.toLowerCase();
    this.isAuthorized = userRole === 'superadmin' || userRole === 'admin';
  }

  // Changer d'onglet et fermer le menu burger si ouvert
  selectTab(tabName: string): void {
    this.activeTab = tabName;
    this.menuOpen = false;
  }

  // Basculer l'affichage du menu burger
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}
