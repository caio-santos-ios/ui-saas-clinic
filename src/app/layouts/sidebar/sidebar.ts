import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Auth, UserSession } from '../../services/auth';
import { ThemeService } from '../../services/theme';

type TMenu = {
  description: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit, OnDestroy {
  user: UserSession | null = null;
  clinicTheme: { primaryColor?: string; secondaryColor?: string; logo?: string } | null = null;
  private sub?: Subscription;
  private themeSub?: Subscription;
  menu: TMenu[] = [];

  constructor(public auth: Auth, private router: Router, public themeService: ThemeService) { }

  ngOnInit() {
    this.user = this.auth.getUser();
    this.clinicTheme = this.auth.getClinicTheme();
    this.themeSub = this.auth.clinicTheme$.subscribe(theme => {
      if (theme) {
        this.clinicTheme = theme;
      }
    });

    if (this.user) {
      switch(this.user.accessProfile) {
        case "admin":  
          this.menu = this.getMenuAdmin();
          break;

        case "master":  
          this.menu = this.getMenuMaster();
          break;

        case "clinic-employee":  
          this.menu = this.getMenuClinicEmployee();
          break;

        case "doctor":  
          this.menu = this.getMenuDoctors();
          break;
      }
    }

    this.sub = this.auth.user$.subscribe(u => {
      this.user = u;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout(event?: Event) {
    if (event) event.stopPropagation();
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }

  getMenuMaster(): TMenu[] {
    return [
      {
        description: "Dashboard",
        icon: "chart-pie",
        link: "dashboard"
      },
      {
        description: "Planos",
        icon: "tags",
        link: "planos"
      },
      {
        description: "Clínicas",
        icon: "hospital",
        link: "clinicas"
      },
      {
        description: "Usuários",
        icon: "users-gear",
        link: "usuarios"
      }
    ]
  }
  
  getMenuAdmin(): TMenu[] {
    return [
      {
        description: "Dashboard",
        icon: "chart-pie",
        link: "dashboard"
      },
      {
        description: "Médicos",
        icon: "user-doctor",
        link: "doctors"
      },
      {
        description: "Procedimentos",
        icon: "stethoscope",
        link: "procedimentos"
      },
      {
        description: "Configurações",
        icon: "sliders",
        link: "configuracoes"
      }
    ]
  }

  getMenuClinicEmployee(): TMenu[] {
    return []
  }

  getMenuDoctors(): TMenu[] {
    return []
  }
}
