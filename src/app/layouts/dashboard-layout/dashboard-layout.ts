import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { ThemeService } from '../../services/theme';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './dashboard-layout.html',
  styleUrls: ['./dashboard-layout.css']
})
export class DashboardLayout implements OnInit, OnDestroy {
  isSidebarOpen = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  clinicTheme: { primaryColor?: string; secondaryColor?: string; logo?: string } | null = null;
  private themeSub?: Subscription;

  constructor(public themeService: ThemeService, public router: Router, public auth: Auth) { }

  async ngOnInit(): Promise<void> {
    this.clinicTheme = this.auth.getClinicTheme();
    this.themeSub = this.auth.clinicTheme$.subscribe(theme => {
      if (theme) {
        this.clinicTheme = theme;
      }
    });
    if (!this.clinicTheme && this.auth.isSignatureValidated()) {
      await this.auth.loadClinicTheme();
    }
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (typeof window !== 'undefined') {
      if (event.target.innerWidth >= 1024) {
        this.isSidebarOpen = true;
      } else {
        this.isSidebarOpen = false;
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeOnMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }
}
