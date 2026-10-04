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

  async ngOnInit() {
    this.user = this.auth.getUser();
    this.updateMenu();
    this.clinicTheme = this.auth.getClinicTheme();
    this.themeSub = this.auth.clinicTheme$.subscribe(theme => {
      if (theme) {
        this.clinicTheme = theme;
      }
    });

    this.sub = this.auth.user$.subscribe(u => {
      this.user = u;
      this.updateMenu();
    });

    await this.auth.loadCurrentUser();
  }

  updateMenu() {
    if (!this.user) return;
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

  get isAdmin(): boolean {
    return this.user?.admin === true || this.user?.accessProfile === 'admin';
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  goToProfile() {
    this.router.navigate(['/perfil']);
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
        description: "Agendamentos",
        icon: "calendar-check",
        link: "agendamentos"
      },
      {
        description: "Médicos",
        icon: "user-doctor",
        link: "medicos"
      },
      {
        description: "Funcionários",
        icon: "users-gear",
        link: "funcionarios"
      },
      {
        description: "Pacientes",
        icon: "hospital-user",
        link: "pacientes"
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
    return [
      {
        description: "Fila de Recepção",
        icon: "users-viewfinder",
        link: "recepcao/fila"
      },
      {
        description: "Agendamentos",
        icon: "calendar-check",
        link: "agendamentos"
      },
      {
        description: "Pacientes",
        icon: "hospital-user",
        link: "pacientes"
      }
    ]
  }

  getMenuDoctors(): TMenu[] {
    return [
      {
        description: "Minha Agenda",
        icon: "calendar-check",
        link: "medico/agenda"
      },
      {
        description: "Meus Pacientes",
        icon: "hospital-user",
        link: "medico/pacientes"
      }
    ]
  }
}
