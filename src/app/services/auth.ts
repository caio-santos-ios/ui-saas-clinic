import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from "jwt-decode";
import { ToastrService } from 'ngx-toastr';

export interface UserSession {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  photo?: string;
  whatsapp?: string;
  accessProfile?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private isBrowser: boolean;
  private userSubject: BehaviorSubject<UserSession | null>;
  user$;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialUser = this.getUser();
    this.userSubject = new BehaviorSubject<UserSession | null>(initialUser);
    this.user$ = this.userSubject.asObservable();
  }

  setToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('token', token);
    }
  }

  setSignatureId(signatureId: string) {
    if (this.isBrowser) {
      localStorage.setItem('signatureId', signatureId);
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  getSignature(): string | null {
    return this.isBrowser ? localStorage.getItem('signatureId') : null;
  }

  setRefreshToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('refreshToken', token);
    }
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem('refreshToken') : null;
  }

  setUser(user: UserSession) {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    }
  }

  getUser(): UserSession | null {
    if (this.isBrowser) {
      const data = localStorage.getItem('token');

      if (data == null) return data;

      const decoded: any = jwtDecode(data);

      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        photo: decoded.photo,
        accessProfile: decoded.accessProfile
      };
    }
    return null;
  }

  clearSession() {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isSignatureValidated(): boolean {
    return !!this.getSignature();
  }

  validatedError(err: any) {
    // const status = err.response.status;
    // if(status > 500 && status < 599) {
    //   this.toastr.error("Falha interna, entre em contato com o Administrador");
    //   return;
    // } 

    // if(status > 400 && status < 499) {
    //   this.toastr.warning(err.response.data.message);
    //   return;
    // } 
  }

  applyClinicTheme(setting: { primaryColor?: string; secondaryColor?: string; logo?: string }) {
    if (!setting) return;
    if (setting.primaryColor) {
      document.documentElement.style.setProperty('--clinic-primary', setting.primaryColor);
      document.documentElement.style.setProperty('--accent-primary', setting.primaryColor);
    }
    if (setting.secondaryColor) {
      document.documentElement.style.setProperty('--clinic-secondary', setting.secondaryColor);
    }
    if (this.isBrowser) {
      localStorage.setItem('clinic_theme', JSON.stringify(setting));
    }
  }

  getClinicTheme(): { primaryColor?: string; secondaryColor?: string; logo?: string } | null {
    if (this.isBrowser) {
      const data = localStorage.getItem('clinic_theme');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }
}
