import { Routes } from '@angular/router';
import { AuthGuard } from '../services/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'products-alternative/:id',
    loadComponent: () =>
      import('./altprod/altprod.component').then((m) => m.AltprodComponent),
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'User'] },
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
    data: { roles: ['Admin', 'User'] },
  },
  {
    path: 'add-product',
    loadComponent: () =>
      import('./addproduct/addproduct.component').then(
        (m) => m.AddproductComponent
      ),
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'User'] },
  },
  {
    path: 'searched-prod',
    loadComponent: () =>
      import('./searched-prod/searched-prod.component').then(
        (m) => m.SearchedProdComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'product-page/:id',
    loadComponent: () =>
      import('./prodpage/prodpage.component').then((m) => m.ProdpageComponent),
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
