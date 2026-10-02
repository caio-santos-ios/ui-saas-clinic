import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const AuthGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  console.log(auth.isPlanValidated())

  if (!auth.isPlanValidated()) {
    router.navigate(['/signature']);
    return false;
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
