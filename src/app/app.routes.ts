import { Routes } from '@angular/router';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Confirmation } from './pages/confirmation/confirmation';
import { AuthGuard } from './guards/auth-guard';
import { Signature } from './pages/signature/signature';

export const routes: Routes = [
  { path: '', component: Signature, pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'reset-password', component: ResetPassword },
  { path: 'confirmation/:code', component: Confirmation },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
