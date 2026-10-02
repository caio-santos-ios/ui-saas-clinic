import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';

interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
}

@Component({
  selector: 'app-signature',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './signature.html',
  styleUrl: './signature.css'
})
export class Signature {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  loadingZip = false;
  showPassword = false;
  logoPreview: string | null = null;

  form: FormGroup;

  palettes: ColorPalette[] = [
    { name: 'Dourado',     primary: '#dca311', secondary: '#0b1120' },
    { name: 'Azul Médico', primary: '#0284c7', secondary: '#0c1a2e' },
    { name: 'Verde Saúde', primary: '#16a34a', secondary: '#052e16' },
    { name: 'Roxo',        primary: '#7c3aed', secondary: '#1e1033' },
    { name: 'Rosa',        primary: '#db2777', secondary: '#1a0011' },
    { name: 'Teal',        primary: '#0d9488', secondary: '#022c22' },
    { name: 'Laranja',     primary: '#ea580c', secondary: '#1c0a00' },
    { name: 'Índigo',      primary: '#4338ca', secondary: '#0d0b2e' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    if (auth.isPlanValidated()) {
      router.navigateByUrl('/login');
    }

    this.form = this.fb.group({
      step1: this.fb.group({
        cnpj:          ['', [Validators.required, Validators.minLength(14)]],
        tradeName:     ['', [Validators.required, Validators.minLength(2)]],
        corporateName: ['', [Validators.required, Validators.minLength(2)]],
        email:         ['', [Validators.required, Validators.email]],
        phone:         ['', [Validators.required, Validators.minLength(10)]],
        password:      ['', [Validators.required, Validators.minLength(6)]],
      }),
      step2: this.fb.group({
        zipCode:      ['', [Validators.required, Validators.minLength(8)]],
        street:       ['', [Validators.required]],
        number:       ['', [Validators.required]],
        complement:   [''],
        neighborhood: ['', [Validators.required]],
        city:         ['', [Validators.required]],
        state:        ['', [Validators.required, Validators.maxLength(2)]],
      }),
      step3: this.fb.group({
        logo:           [''],
        primaryColor:   ['#dca311', [Validators.required]],
        secondaryColor: ['#0b1120'],
        acceptedTerms:  [false, [Validators.requiredTrue]],
      }),
    });
  }

  get s1() { return this.form.get('step1') as FormGroup; }
  get s2() { return this.form.get('step2') as FormGroup; }
  get s3() { return this.form.get('step3') as FormGroup; }

  field(path: string): AbstractControl {
    return this.form.get(path)!;
  }

  err(path: string): string | null {
    const c = this.form.get(path);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required'])   return 'Campo obrigatório';
    if (c.errors?.['requiredTrue']) return 'Aceite os termos para continuar';
    if (c.errors?.['email'])      return 'E-mail inválido';
    if (c.errors?.['minlength'])  return `Mínimo ${c.errors?.['minlength'].requiredLength} caracteres`;
    if (c.errors?.['maxlength'])  return `Máximo ${c.errors?.['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  nextStep(): void {
    const stepGroup = this.form.get(`step${this.currentStep}`) as FormGroup;

    if (stepGroup.invalid) {
      stepGroup.markAllAsTouched();
      this.toastr.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.cdr.detectChanges();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.cdr.detectChanges();
    }
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  triggerLogoUpload(): void {
    this.logoInput?.nativeElement.click();
  }

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('O logotipo deve ter no máximo 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.s3.patchValue({ logo: reader.result as string });
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeLogo(event: Event): void {
    event.stopPropagation();
    this.logoPreview = null;
    this.s3.patchValue({ logo: '' });
    if (this.logoInput?.nativeElement) {
      this.logoInput.nativeElement.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const fakeEvent = { target: { files: [file] } } as any;
    this.onLogoChange(fakeEvent);
  }

  async onZipCodeBlur(): Promise<void> {
    const zip = this.s2.get('zipCode')?.value?.replace(/\D/g, '') ?? '';
    if (zip.length !== 8) return;

    this.loadingZip = true;
    this.cdr.detectChanges();

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = await response.json();

      if (!data.erro) {
        this.s2.patchValue({
          street:       data.logradouro || '',
          neighborhood: data.bairro     || '',
          city:         data.localidade || '',
          state:        data.uf         || '',
        });
        this.toastr.success('Endereço preenchido automaticamente!');
      } else {
        this.toastr.warning('CEP não encontrado.');
      }
    } catch {
      this.toastr.error('Não foi possível buscar o CEP.');
    } finally {
      this.loadingZip = false;
      this.cdr.detectChanges();
    }
  }

  applyPalette(palette: ColorPalette): void {
    this.s3.patchValue({
      primaryColor:   palette.primary,
      secondaryColor: palette.secondary,
    });
    this.cdr.detectChanges();
  }

  get primaryColor(): string {
    return this.s3.get('primaryColor')?.value || '#dca311';
  }

  get secondaryColor(): string {
    return this.s3.get('secondaryColor')?.value || '#0b1120';
  }

  get tradeName(): string {
    return this.s1.get('tradeName')?.value || 'Nome da Clínica';
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastr.warning('Verifique os campos antes de continuar.');
      return;
    }

    const { step1, step2, step3 } = this.form.value;

    const payload = {
      cnpj:          step1.cnpj,
      tradeName:     step1.tradeName,
      corporateName: step1.corporateName,
      email:         step1.email,
      phone:         step1.phone,
      password:      step1.password,
      address: {
        zipCode:      step2.zipCode,
        street:       step2.street,
        number:       step2.number,
        complement:   step2.complement,
        neighborhood: step2.neighborhood,
        city:         step2.city,
        state:        step2.state,
      },
      setting: {
        logo:           step3.logo,
        primaryColor:   step3.primaryColor,
        secondaryColor: step3.secondaryColor,
      },
    };

    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const { data } = await api.post('/api/auth/register-admin', payload);
      this.router.navigateByUrl('/login');
    } catch (err: any) {
      this.auth.validatedError(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
