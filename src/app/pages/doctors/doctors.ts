import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';
import { ResetPagination, TPagination } from '../../types/pagination.type';
import { PhonePipe } from '../../pipes/phone.pipe';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective, PhonePipe],
  providers: [provideNgxMask()],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css'
})
export class Doctors implements OnInit {
  isLoading = false;
  isSaving = false;
  loadingZip = false;
  deleteModal = false;
  isDeleting = false;
  doctorToDelete: any | null = null;

  data: TPagination = ResetPagination;
  doctor: any | null = null;
  modal: boolean = false;
  activeTab: 'personal' | 'professional' | 'address' = 'personal';
  form: FormGroup;
  search: string = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  visiblePages: number[] = [];

  totalDoctors = 0;
  activeDoctors = 0;
  blockedDoctors = 0;
  totalSpecialties = 0;

  states: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  specialties: string[] = [
    'Cardiologia',
    'Cirurgia Geral',
    'Cirurgia Plástica',
    'Clínica Médica',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia e Obstetrícia',
    'Mastologia',
    'Neurologia',
    'Oftalmologia',
    'Ortopedia e Traumatologia',
    'Otorrinolaringologia',
    'Pediatria',
    'Pneumologia',
    'Psiquiatria',
    'Radiologia',
    'Urologia'
  ];

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
      phone: ['', [Validators.required]],
      password: [''],
      specialty: ['', [Validators.required]],
      licenseNumber: ['', [Validators.required]],
      licenseState: ['SP', [Validators.required]],
      bio: [''],
      zipCode: [''],
      street: [''],
      number: [''],
      complement: [''],
      neighborhood: [''],
      city: [''],
      state: ['SP'],
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData(page: number = 1) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const params: any = {
        page,
        pageSize: 10,
        deleted: false
      };

      if (this.search?.trim()) {
        params['regex$name'] = this.search.trim();
      }

      if (this.statusFilter === 'active') {
        params.blocked = false;
      } else if (this.statusFilter === 'blocked') {
        params.blocked = true;
      }

      const { data } = await api.get('/api/doctors', { params });

      if (data?.data) {
        this.data = data.data;
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

  updateKPIs(doctors: any[], totalCount: number) {
    this.totalDoctors = totalCount;
    this.activeDoctors = doctors.filter(d => !d.blocked).length;
    this.blockedDoctors = doctors.filter(d => !!d.blocked).length;
    const specSet = new Set(doctors.map(d => d.specialty).filter(Boolean));
    this.totalSpecialties = specSet.size;
  }

  onSearch() {
    this.loadData(1);
  }

  clearSearch() {
    this.search = '';
    this.statusFilter = 'all';
    this.loadData(1);
  }

  setStatusFilter(filter: 'all' | 'active' | 'blocked') {
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

  setTab(tab: 'personal' | 'professional' | 'address') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  openModal(doctor?: any | null) {
    this.doctor = doctor || null;
    this.activeTab = 'personal';

    if (doctor) {
      this.form.patchValue({
        name: doctor.name || '',
        email: doctor.email || '',
        phone: doctor.phone || '',
        password: '',
        specialty: doctor.specialty || '',
        licenseNumber: doctor.licenseNumber || '',
        licenseState: doctor.licenseState || 'SP',
        bio: doctor.bio || '',
        zipCode: doctor.address?.zipCode || '',
        street: doctor.address?.street || '',
        number: doctor.address?.number || '',
        complement: doctor.address?.complement || '',
        neighborhood: doctor.address?.neighborhood || '',
        city: doctor.address?.city || '',
        state: doctor.address?.state || 'SP'
      });
    } else {
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        password: '',
        specialty: '',
        licenseNumber: '',
        licenseState: 'SP',
        bio: '',
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'SP'
      });
    }

    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.doctor = null;
    this.modal = false;
    this.activeTab = 'personal';
    this.form.reset();
    this.cdr.detectChanges();
  }

  async saveDoctor() {
    try {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        if (this.err('name') || this.err('email') || this.err('phone')) {
          this.activeTab = 'personal';
        } else if (this.err('specialty') || this.err('licenseNumber') || this.err('licenseState')) {
          this.activeTab = 'professional';
        }
        this.toastr.warning('Preencha os campos obrigatórios.');
        return;
      }
  
      this.isSaving = true;
      this.cdr.detectChanges();

      const val = this.form.value;
      const payload: any = {
        name: val.name,
        email: val.email?.trim().toLowerCase(),
        phone: val.phone,
        specialty: val.specialty,
        licenseNumber: val.licenseNumber,
        licenseState: val.licenseState,
        bio: val.bio,
        address: {
          zipCode: val.zipCode || '',
          street: val.street || '',
          number: val.number || '',
          complement: val.complement || '',
          neighborhood: val.neighborhood || '',
          city: val.city || '',
          state: val.state || ''
        }
      };

      if (val.password) {
        payload.password = val.password;
      }

      if (this.doctor?.id) {
        payload.id = this.doctor.id;
        await api.put('/api/doctors', payload);
        this.toastr.success('Médico atualizado com sucesso!');
      } else {
        await api.post('/api/doctors', payload);
        this.toastr.success('Médico cadastrado com sucesso!');
      }

      this.closeModal();
      await this.loadData(this.doctor ? this.data.currentPage : 1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async searchCep() {
    const zip = (this.form.get('zipCode')?.value || '').replace(/\D/g, '');
    if (zip.length !== 8) return;

    this.loadingZip = true;
    this.cdr.detectChanges();

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        this.form.patchValue({
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        });
      } else {
        this.toastr.warning('CEP não encontrado');
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.loadingZip = false;
      this.cdr.detectChanges();
    }
  }

  async toggleBlock(doctor: any) {
    try {
      const { data } = await api.patch(`/api/doctors/${doctor.id}/toggle-block`);
      doctor.blocked = data.data.blocked;
      this.toastr.success(data.message || (doctor.blocked ? 'Médico bloqueado.' : 'Médico desbloqueado.'));
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  openDeleteModal(doctor: any) {
    this.doctorToDelete = doctor;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.doctorToDelete = null;
    this.deleteModal = false;
    this.cdr.detectChanges();
  }

  async confirmDelete() {
    try {
      if (!this.doctorToDelete) return;
  
      this.isDeleting = true;
      this.cdr.detectChanges();

      await api.delete(`/api/doctors/${this.doctorToDelete.id}`);
      this.toastr.success('Médico removido com sucesso!');
      this.closeDeleteModal();
      await this.loadData(1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['email'] || c.errors?.['pattern']) return 'E-mail inválido';
    return 'Campo inválido';
  }
}
