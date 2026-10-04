import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  form: FormGroup;
  clinicSetting: any = null;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
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

    this.route.params.subscribe(async params => {
      const code = params['code'] || this.route.snapshot.queryParams['code'] || '';
      const clinicId = this.route.snapshot.queryParams['clinicId'] || '';

      if (clinicId) {
        await this.loadThemeByClinicId(clinicId);
      }

      if (code) {
        this.form.patchValue({ code });
        if (!this.clinicSetting) {
          await this.loadThemeByCode(code);
        }
      }
    });

    this.form.get('code')?.valueChanges.subscribe(val => {
      if (val && val.length === 6 && !this.clinicSetting) {
        this.loadThemeByCode(val);
      }
    });
  }

  async loadThemeByCode(code: string): Promise<void> {
    try {
      const { data } = await api.get(`/api/auth/theme/${code}`);
      if (data?.data) {
        this.clinicSetting = data.data;
        this.auth.applyClinicTheme(this.clinicSetting);
        this.cdr.detectChanges();
      }
    } catch {
    }
  }

  async loadThemeByClinicId(clinicId: string): Promise<void> {
    try {
      const { data } = await api.get(`/api/auth/theme/clinic/${clinicId}`);
      if (data?.data) {
        this.clinicSetting = data.data;
        this.auth.applyClinicTheme(this.clinicSetting);
        this.cdr.detectChanges();
      }
    } catch {
    }
  }

  field(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['minlength']) return `Mínimo ${c.errors?.['minlength'].requiredLength} caracteres`;
    if (c.errors?.['maxlength']) return `Máximo ${c.errors?.['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    try {
      this.form.markAllAsTouched();

      if (this.form.invalid) {
        this.toastr.warning('Preencha todos os campos corretamente.');
        return;
      }

      const { code, password, confirmPassword } = this.form.value;

      if (password !== confirmPassword) {
        this.toastr.warning('As senhas não coincidem.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      const { data } = await api.post('/api/auth/reset-password', {
        code,
        password
      });

      this.toastr.success(data.message || 'Senha alterada com sucesso!');
      setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, 500);
    } catch (error: any) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async getSignature() {
    try {
      const id = this.auth.getSignature() ?? '';
      const { data } = await api.get(`/api/signatures/${id}`);
      this.clinicSetting = data.data.clinicSetting;
      this.auth.applyClinicTheme(data.data.clinicSetting);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }
}