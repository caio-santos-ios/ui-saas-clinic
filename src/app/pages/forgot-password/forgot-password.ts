import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword implements OnInit {
  showPassword = false;
  isLoading = false;
  form: FormGroup;
  clinicSetting: any = null;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async ngOnInit(): Promise<void> {
    this.clinicSetting = this.auth.getClinicTheme();
    if (this.clinicSetting) {
      this.auth.applyClinicTheme(this.clinicSetting);
    }
    if (this.auth.isSignatureValidated()) {
      await this.getSignature();
    }
  }

  field(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email']) return 'E-mail inválido';
    if (c.errors?.['minlength']) return `Mínimo ${c.errors?.['minlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    try {
      this.form.markAllAsTouched();

      if (this.form.invalid) {
        this.toastr.warning('Preencha seu e-mail corretamente.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      const { email, password } = this.form.value;

      const { data } = await api.post('/api/auth/forgot-password', {
        email
      });

      this.toastr.success(data.message);
      setTimeout(() => {
        this.router.navigateByUrl("/login");
      }, 300)
    } catch (err: any) {
      this.auth.validatedError(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async getSignature() {
    try {
      const id = this.auth.getSignature() ?? "";
      const { data } = await api.get(`/api/signatures/${id}`);
      this.clinicSetting = data.data.clinicSetting;
      this.auth.applyClinicTheme(data.data.clinicSetting);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }
}