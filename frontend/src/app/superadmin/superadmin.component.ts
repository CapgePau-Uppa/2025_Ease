import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { SuperAdminDashboardComponent } from './comp/super-admin-dashboard/super-admin-dashboard.component';

@Component({
  selector: 'app-superadmin',
  standalone: true,
  imports: [NavbarComponent, CommonModule, SuperAdminDashboardComponent],
  templateUrl: './superadmin.component.html',
  styleUrl: './superadmin.component.css'
})
export class SuperadminComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    console.log('SuperadminComponent Initialized');
  }
}
