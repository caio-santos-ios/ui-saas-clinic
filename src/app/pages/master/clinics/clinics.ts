import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';

@Component({
  selector: 'app-master-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective, NgxMaskPipe],
  providers: [provideNgxMask()],
  templateUrl: './clinics.html',
  styleUrl: './clinics.css'
})
export class MasterClinics implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  loadingCnpj = false;
  loadingZip = false;

  data: TPagination = ResetPagination;
  search: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  visiblePages: number[] = [];

  modal = false;
  deleteModal = false;
  detailsModal = false;

  editingClinic: any | null = null;
  clinicToDelete: any | null = null;
  selectedClinicDetails: any | null = null;

  activeTab: 'general' | 'address' | 'visual' = 'general';
  form: FormGroup;

  totalClinics = 0;
  activeClinics = 0;
  inactiveClinics = 0;
  trialClinics = 0;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      cnpj: ['', [Validators.required, Validators.minLength(14)]],
      tradeName: ['', [Validators.required, Validators.minLength(2)]],
      corporateName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      active: [true],
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
    this.loadData(1);
  }

  async loadData(page: number = 1) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const params: any = { page, pageSize: 10, deleted: false };
      if (this.search.trim()) {
        params['regex$tradeName'] = this.search.trim();
      }
      if (this.statusFilter === 'active') {
        params.active = true;
      } else if (this.statusFilter === 'inactive') {
        params.active = false;
      }

      const { data } = await api.get('/api/clinics', { params });

      if (data?.data) {
        this.data = {
          data: data.data.data || [],
          totalCount: data.data.totalCount || 0,
          totalPages: data.data.totalPages || 1,
          currentPage: page
        };
        this.updateKPIs(this.data.data, this.data.totalCount);
        this.updateVisiblePages();
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  updateKPIs(clinics: any[], totalCount: number) {
    this.totalClinics = totalCount;
    this.activeClinics = clinics.filter(c => c.active !== false).length;
    this.inactiveClinics = clinics.filter(c => c.active === false).length;
    this.trialClinics = clinics.filter(c => c.signature?.status?.toLowerCase() === 'trial' || c.signature?.status?.toLowerCase() === 'pendente').length;
  }

  onSearch() {
    this.loadData(1);
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive') {
    this.statusFilter = filter;
    this.loadData(1);
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.data.totalPages || page === this.data.currentPage) return;
    this.loadData(page);
  }

  updateVisiblePages() {
    const total = this.data.totalPages;
    const current = this.data.currentPage;
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    this.visiblePages = [];
    for (let i = start; i <= end; i++) {
      this.visiblePages.push(i);
    }
  }

  setTab(tab: 'general' | 'address' | 'visual') {
    this.activeTab = tab;
  }

  openModal(clinic?: any) {
    this.activeTab = 'general';
    if (clinic) {
      this.editingClinic = clinic;
      this.form.patchValue({
        cnpj: clinic.cnpj || '',
        tradeName: clinic.tradeName || '',
        corporateName: clinic.corporateName || '',
        email: clinic.email || '',
        phone: clinic.phone || '',
        active: clinic.active !== false,
        address: {
          zipCode: clinic.address?.zipCode || '',
          street: clinic.address?.street || '',
          number: clinic.address?.number || '',
          complement: clinic.address?.complement || '',
          neighborhood: clinic.address?.neighborhood || '',
          city: clinic.address?.city || '',
          state: clinic.address?.state || ''
        },
        setting: {
          logo: clinic.setting?.logo || '',
          primaryColor: clinic.setting?.primaryColor || '#dca311',
          secondaryColor: clinic.setting?.secondaryColor || '#0b1120'
        }
      });
    } else {
      this.editingClinic = null;
      this.form.reset({
        cnpj: '',
        tradeName: '',
        corporateName: '',
        email: '',
        phone: '',
        active: true,
        address: {
          zipCode: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: ''
        },
        setting: {
          logo: '',
          primaryColor: '#dca311',
          secondaryColor: '#0b1120'
        }
      });
    }
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.editingClinic = null;
  }

  openDetails(clinic: any) {
    this.selectedClinicDetails = clinic;
    this.detailsModal = true;
    this.cdr.detectChanges();
  }

  closeDetails() {
    this.detailsModal = false;
    this.selectedClinicDetails = null;
  }

  openDeleteModal(clinic: any) {
    this.clinicToDelete = clinic;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModal = false;
    this.clinicToDelete = null;
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
        this.toastr.success('Dados da empresa importados da Receita Federal!');
      }
    } catch {
    } finally {
      this.loadingCnpj = false;
      this.cdr.detectChanges();
    }
  }

  private consultCnpj(cnpj: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const callbackName = 'receitaws_' + Math.floor(Math.random() * 1000000);
      const script = document.createElement('script');
      script.src = `https://receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, 10000);

      const cleanup = () => {
        delete (window as any)[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timer);
      };

      (window as any)[callbackName] = (data: any) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('Erro'));
      };

      document.body.appendChild(script);
    });
  }

  async toggleActive(clinic: any) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const { data } = await api.patch(`/api/clinics/${clinic.id}/status`);
      this.toastr.success(data?.message || 'Status da clínica alterado com sucesso.');
      clinic.active = !clinic.active;
      this.updateKPIs(this.data.data, this.data.totalCount);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async saveClinic() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toastr.warning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const val = this.form.value;
      const payload: any = {
        cnpj: val.cnpj.replace(/\D/g, ''),
        tradeName: val.tradeName,
        corporateName: val.corporateName,
        email: val.email,
        phone: val.phone.replace(/\D/g, ''),
        active: val.active,
        address: {
          zipCode: (val.address.zipCode || '').replace(/\D/g, ''),
          street: val.address.street || '',
          number: val.address.number || '',
          complement: val.address.complement || '',
          neighborhood: val.address.neighborhood || '',
          city: val.address.city || '',
          state: val.address.state || ''
        },
        setting: {
          logo: val.setting.logo || '',
          primaryColor: val.setting.primaryColor || '#dca311',
          secondaryColor: val.setting.secondaryColor || '#0b1120'
        }
      };

      if (this.editingClinic) {
        payload.id = this.editingClinic.id;
        const { data } = await api.put('/api/clinics', payload);
        this.toastr.success(data?.message || 'Clínica atualizada com sucesso.');
      } else {
        const { data } = await api.post('/api/clinics', payload);
        this.toastr.success(data?.message || 'Clínica criada com sucesso.');
      }

      this.closeModal();
      this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async confirmDelete() {
    if (!this.clinicToDelete) return;

    try {
      this.isDeleting = true;
      this.cdr.detectChanges();

      const { data } = await api.delete(`/api/clinics/${this.clinicToDelete.id}`);
      this.toastr.success(data?.message || 'Clínica removida com sucesso.');
      this.closeDeleteModal();
      this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  err(path: string): string | null {
    const c = this.form.get(path);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email']) return 'E-mail inválido';
    if (c.errors?.['minlength']) return `Mínimo de ${c.errors?.['minlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }
}
