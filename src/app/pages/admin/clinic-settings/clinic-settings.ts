import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { Auth, UserSession } from '../../../services/auth';
import { ThemeService } from '../../../services/theme';
import { api } from '../../../services/api';

@Component({
  selector: 'app-clinic-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './clinic-settings.html',
  styleUrl: './clinic-settings.css'
})
export class ClinicSettings implements OnInit {
  @ViewChild('logoInput') logoInput?: ElementRef<HTMLInputElement>;

  isLoading = false;
  isSaving = false;
  loadingCnpj = false;
  loadingZip = false;
  isUploadingLogo = false;

  logoPreview: string | null = null;

  activeTab: 'general' | 'address' | 'visual' | 'plan' = 'general';
  form: FormGroup;

  user: UserSession | null = null;
  clinicId: string = '';
  clinicData: any = null;
  signatureData: any = null;
  planData: any = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public global: GlobalService,
    public auth: Auth,
    public themeService: ThemeService
  ) {
    this.form = this.fb.group({
      id: [''],
      cnpj: ['', [Validators.required, Validators.minLength(14)]],
      tradeName: ['', [Validators.required, Validators.minLength(2)]],
      corporateName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: this.fb.group({
        zipCode: [''],
        street: [''],
        number: [''],
        complement: [''],
        neighborhood: [''],
        city: [''],
        state: ['']
      }),
      setting: this.fb.group({
        logo: [''],
        primaryColor: ['#dca311'],
        secondaryColor: ['#0b1120']
      })
    });
  }

  ngOnInit() {
    this.user = this.auth.getUser();
    this.clinicId = this.user?.clinicId || '';
    this.loadClinicData();
  }

  setTab(tab: 'general' | 'address' | 'visual' | 'plan') {
    this.activeTab = tab;
  }

  async loadClinicData() {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const url = this.clinicId ? `/api/clinics/${this.clinicId}` : '/api/clinics/my-clinic';
      const { data } = await api.get(url);

      if (data && data.data) {
        this.clinicData = data.data;
        this.signatureData = data.data.signature || null;
        this.planData = this.signatureData?.plan || null;
        if (!this.clinicId && this.clinicData.id) {
          this.clinicId = this.clinicData.id;
        }

        this.logoPreview = this.clinicData.setting?.logo || null;

        this.form.patchValue({
          id: this.clinicData.id || this.clinicData._id || this.clinicId,
          cnpj: (this.clinicData.cnpj || '').replace(/\D/g, ''),
          tradeName: this.clinicData.tradeName || '',
          corporateName: this.clinicData.corporateName || '',
          email: this.clinicData.email || '',
          phone: (this.clinicData.phone || '').replace(/\D/g, ''),
          address: {
            zipCode: (this.clinicData.address?.zipCode || '').replace(/\D/g, ''),
            street: this.clinicData.address?.street || '',
            number: this.clinicData.address?.number || '',
            complement: this.clinicData.address?.complement || '',
            neighborhood: this.clinicData.address?.neighborhood || '',
            city: this.clinicData.address?.city || '',
            state: this.clinicData.address?.state || ''
          },
          setting: {
            logo: this.clinicData.setting?.logo || '',
            primaryColor: this.clinicData.setting?.primaryColor || '#dca311',
            secondaryColor: this.clinicData.setting?.secondaryColor || '#0b1120'
          }
        });

        if (this.clinicData.setting) {
          this.auth.applyClinicTheme(this.clinicData.setting);
        }
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  triggerLogoUpload(): void {
    this.logoInput?.nativeElement.click();
  }

  async onLogoChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('O logotipo deve ter no máximo 2 MB.');
      return;
    }

    await this.uploadLogo(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  async uploadLogo(file: File) {
    try {
      this.isUploadingLogo = true;
      this.cdr.detectChanges();

      const body = new FormData();
      body.append('file', file);
      body.append('parentId', this.clinicId || 'sem-id');
      body.append('parent', 'clinic');

      const { data } = await api.post('/api/attachments/logo', body);
      const uri = data?.data?.uri || '';
      if (uri) {
        this.form.patchValue({ setting: { logo: uri } });
        this.toastr.success('Logotipo enviado com sucesso.');
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isUploadingLogo = false;
      this.cdr.detectChanges();
    }
  }

  removeLogo(event: Event): void {
    event.stopPropagation();
    this.logoPreview = null;
    this.form.patchValue({ setting: { logo: '' } });
    if (this.logoInput?.nativeElement) {
      this.logoInput.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    await this.uploadLogo(file);
    const fakeEvent = { target: { files: [file] } } as any;
    this.onLogoChange(fakeEvent);
  }

  async searchCep() {
    const raw = (this.form.get('address.zipCode')?.value || '').replace(/\D/g, '');
    if (raw.length !== 8) return;

    try {
      this.loadingZip = true;
      this.cdr.detectChanges();

      const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await resp.json();

      if (!data.erro) {
        this.form.patchValue({
          address: {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }
        });
        this.toastr.success('Endereço preenchido automaticamente.');
      } else {
        this.toastr.warning('CEP não localizado.');
      }
    } catch {
      this.toastr.error('Erro ao consultar CEP.');
    } finally {
      this.loadingZip = false;
      this.cdr.detectChanges();
    }
  }

  async onCnpjBlur() {
    const raw = (this.form.get('cnpj')?.value || '').replace(/\D/g, '');
    if (raw.length !== 14) return;

    try {
      this.loadingCnpj = true;
      this.cdr.detectChanges();

      const data: any = await this.consultCnpj(raw);
      if (data && data.status !== 'ERROR') {
        const phone = (data.telefone || '').split('/')[0].replace(/\D/g, '');
        const email = (data.email || '').trim().toLowerCase();

        this.form.patchValue({
          tradeName: data.fantasia || data.nome || this.form.get('tradeName')?.value || '',
          corporateName: data.nome || this.form.get('corporateName')?.value || '',
          ...(email ? { email } : {}),
          ...(phone.length >= 10 ? { phone } : {}),
          address: {
            zipCode: (data.cep || '').replace(/\D/g, '') || this.form.get('address.zipCode')?.value || '',
            street: data.logradouro || this.form.get('address.street')?.value || '',
            number: data.numero || this.form.get('address.number')?.value || '',
            complement: data.complemento || this.form.get('address.complement')?.value || '',
            neighborhood: data.bairro || this.form.get('address.neighborhood')?.value || '',
            city: data.municipio || this.form.get('address.city')?.value || '',
            state: (data.uf || '').substring(0, 2).toUpperCase() || this.form.get('address.state')?.value || ''
          }
        });
        this.toastr.success('Dados da Receita Federal carregados com sucesso.');
      }
    } catch {
      this.toastr.warning('Não foi possível consultar os dados da Receita Federal.');
    } finally {
      this.loadingCnpj = false;
      this.cdr.detectChanges();
    }
  }

  private consultCnpj(cnpj: string) {
    return new Promise((resolve) => {
      const callbackName = 'jsonp_cnpj_' + Math.round(100000 * Math.random());
      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      const script = document.createElement('script');
      script.src = `https://receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(null);
      };
      document.body.appendChild(script);
    });
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Campo obrigatório';
    if (c.errors['email']) return 'E-mail inválido';
    if (c.errors['minlength']) return `Mínimo de ${c.errors['minlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const raw = this.form.value;
      const payload = {
        id: raw.id || this.clinicId,
        cnpj: (raw.cnpj || '').replace(/\D/g, ''),
        tradeName: raw.tradeName,
        corporateName: raw.corporateName,
        email: raw.email,
        phone: (raw.phone || '').replace(/\D/g, ''),
        address: raw.address,
        setting: raw.setting
      };

      const { data } = await api.put('/api/clinics', payload);

      if (data && (data.statusCode === 200 || data.data)) {
        this.toastr.success('Configurações atualizadas com sucesso!');
        if (raw.setting) {
          this.auth.applyClinicTheme(raw.setting);
        }
        await this.loadClinicData();
      } else {
        this.toastr.error(data?.message || 'Falha ao salvar configurações.');
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  goToUpgrade() {
    this.router.navigate(['/plans']);
  }

  getSignatureStatusBadgeClass(status?: string): string {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ATIVO':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'PENDENTE':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'VENCIDO':
      case 'ATRASADO':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'CANCELADO':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      default:
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
    }
  }

  getPaymentMethodDescription(method?: string): string {
    const m = (method || '').toLowerCase();
    switch (m) {
      case 'credit_card':
      case 'cartao':
        return 'Cartão de Crédito';
      case 'pix':
        return 'Pix Instantâneo';
      case 'boleto':
        return 'Boleto Bancário';
      default:
        return method || 'Não informado';
    }
  }

  getCycleDescription(cycle?: string): string {
    const c = (cycle || '').toLowerCase();
    return c === 'yearly' || c === 'anual' ? 'Anual' : 'Mensal';
  }
}
