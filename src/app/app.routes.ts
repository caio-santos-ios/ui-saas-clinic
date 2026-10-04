import { Routes } from '@angular/router';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Confirmation } from './pages/confirmation/confirmation';
import { AuthGuard } from './guards/auth-guard';
import { Signature } from './pages/signature/signature';
import { Plans } from './pages/plans/plans';
import { Doctors } from './pages/doctors/doctors';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { MasterPlans } from './pages/master/plans/plans';
import { MasterClinics } from './pages/master/clinics/clinics';
import { MasterUsers } from './pages/master/users/users';
import { ClinicSettings } from './pages/admin/clinic-settings/clinic-settings';

export const routes: Routes = [
  { path: '', component: Signature, pathMatch: 'full' },
  { path: 'plans', component: Plans },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'reset-password/:code', component: ResetPassword },
  { path: 'confirmation/:code', component: Confirmation },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'doctors', component: Doctors },
      { path: 'configuracoes', component: ClinicSettings },
      { path: 'settings', redirectTo: 'configuracoes' },
      { path: 'admin/settings', redirectTo: 'configuracoes' },
      { path: 'planos', component: MasterPlans },
      { path: 'master/plans', redirectTo: 'planos' },
      { path: 'clinicas', component: MasterClinics },
      { path: 'master/clinics', redirectTo: 'clinicas' },
      { path: 'usuarios', component: MasterUsers },
      { path: 'master/users', redirectTo: 'usuarios' },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
