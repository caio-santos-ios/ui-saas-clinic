import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';
import { PhonePipe } from '../../../pipes/phone.pipe';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective, PhonePipe],
  providers: [provideNgxMask()],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class Patients implements OnInit {
  isLoading = false;
  isSaving = false;
  loadingZip = false;
  deleteModal = false;
  isDeleting = false;
  patientToDelete: any | null = null;

  data: TPagination = ResetPagination;
  patient: any | null = null;
  modal: boolean = false;
  activeTab: 'personal' | 'medical' | 'address' = 'personal';
  form: FormGroup;
  search: string = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  visiblePages: number[] = [];

  totalPatients = 0;
  activePatients = 0;
  blockedPatients = 0;

  states: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  bloodTypes: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  genders: { label: string; value: string }[] = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Feminino', value: 'Feminino' },
    { label: 'Outro', value: 'Outro' },
    { label: 'Prefiro não informar', value: 'Não informado' }
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
      cpf: [''],
      rg: [''],
      birthDate: [''],
      gender: [''],
      bloodType: [''],
      allergies: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelationship: [''],
      notes: [''],
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

      const { data } = await api.get('/api/patients', { params });

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

  updateKPIs(patients: any[], totalCount: number) {
    this.totalPatients = totalCount;
    this.activePatients = patients.filter(p => !p.blocked).length;
    this.blockedPatients = patients.filter(p => !!p.blocked).length;
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

  setTab(tab: 'personal' | 'medical' | 'address') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  openModal(patient?: any | null) {
    this.patient = patient || null;
    this.activeTab = 'personal';

    if (patient) {
      const allergiesStr = Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies || '');
      this.form.patchValue({
        name: patient.name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        password: '',
        cpf: patient.cpf || '',
        rg: patient.rg || '',
        birthDate: patient.birthDate ? patient.birthDate.substring(0, 10) : '',
        gender: patient.gender || '',
        bloodType: patient.bloodType || '',
        allergies: allergiesStr,
        emergencyContactName: patient.emergencyContactName || '',
        emergencyContactPhone: patient.emergencyContactPhone || '',
        emergencyContactRelationship: patient.emergencyContactRelationship || '',
        notes: patient.notes || '',
        zipCode: patient.address?.zipCode || '',
        street: patient.address?.street || '',
        number: patient.address?.number || '',
        complement: patient.address?.complement || '',
        neighborhood: patient.address?.neighborhood || '',
        city: patient.address?.city || '',
        state: patient.address?.state || 'SP'
      });
    } else {
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        password: '',
        cpf: '',
        rg: '',
        birthDate: '',
        gender: '',
        bloodType: '',
        allergies: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        notes: '',
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
    this.patient = null;
    this.modal = false;
    this.activeTab = 'personal';
    this.form.reset();
    this.cdr.detectChanges();
  }

  async savePatient() {
    try {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        if (this.err('name') || this.err('email') || this.err('phone')) {
          this.activeTab = 'personal';
        }
        this.toastr.warning('Preencha os campos obrigatórios.');
        return;
      }

      this.isSaving = true;
      this.cdr.detectChanges();

      const val = this.form.value;
      const allergiesList = val.allergies
        ? val.allergies.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [];

      const payload: any = {
        name: val.name,
        email: val.email?.trim().toLowerCase(),
        phone: val.phone,
        cpf: val.cpf || '',
        rg: val.rg || '',
        birthDate: val.birthDate ? new Date(val.birthDate).toISOString() : null,
        gender: val.gender || '',
        bloodType: val.bloodType || '',
        allergies: allergiesList,
        emergencyContactName: val.emergencyContactName || '',
        emergencyContactPhone: val.emergencyContactPhone || '',
        emergencyContactRelationship: val.emergencyContactRelationship || '',
        notes: val.notes || '',
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

      if (this.patient?.id) {
        payload.id = this.patient.id;
        await api.put('/api/patients', payload);
        this.toastr.success('Paciente atualizado com sucesso!');
      } else {
        await api.post('/api/patients', payload);
        this.toastr.success('Paciente cadastrado com sucesso!');
      }

      this.closeModal();
      await this.loadData(this.patient ? this.data.currentPage : 1);
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

  async toggleBlock(patient: any) {
    try {
      const { data } = await api.patch(`/api/patients/${patient.id}/toggle-block`);
      patient.blocked = data.data.blocked;
      this.toastr.success(data.message || (patient.blocked ? 'Paciente bloqueado.' : 'Paciente desbloqueado.'));
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  openDeleteModal(patient: any) {
    this.patientToDelete = patient;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.patientToDelete = null;
    this.deleteModal = false;
    this.cdr.detectChanges();
  }

  async confirmDelete() {
    try {
      if (!this.patientToDelete) return;

      this.isDeleting = true;
      this.cdr.detectChanges();

      await api.delete(`/api/patients/${this.patientToDelete.id}`);
      this.toastr.success('Paciente removido com sucesso!');
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
