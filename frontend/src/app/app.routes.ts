import { Routes } from '@angular/router';
import { AuthGuard } from '../services/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () =>
      import('./superadmin/superadmin.component').then((m) => m.SuperadminComponent),
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'SuperAdmin'] },
  },
  {
    path: 'products-alternative/:id/:source',
    loadComponent: () =>
      import('./altprod/altprod.component').then((m) => m.AltprodComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./homepage/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'category',
    loadComponent: () =>
      import('./category/category.component').then((m) => m.CategoryComponent),
  },
  {
    path: 'user-profile',
    loadComponent: () =>
      import('./userprofile/userprofile.component').then(
        (m) => m.UserprofileComponent
      ),
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'User', 'SuperAdmin'] },
  },
  {
    path: 'add-product',
    loadComponent: () =>
      import('./addproduct/addproduct.component').then(
        (m) => m.AddproductComponent
      ),
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'User', 'SuperAdmin'] },
  },
  {
    path: 'searched-prod',
    loadComponent: () =>
      import('./searched-prod/searched-prod.component').then(
        (m) => m.SearchedProdComponent
      ),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'login',
    redirectTo: '/auth',
    pathMatch: 'full',
  },
  {
    path: 'register',
    redirectTo: '/auth',
    pathMatch: 'full',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'product-page/:id/:source',
    loadComponent: () => import('./prodpage/prodpage.component').then(m => m.ProdpageComponent)
  },
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/home',
  },
];
