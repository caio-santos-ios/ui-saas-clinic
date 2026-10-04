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
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective, PhonePipe],
  providers: [provideNgxMask()],
  templateUrl: './employees.html',
  styleUrl: './employees.css'
})
export class Employees implements OnInit {
  isLoading = false;
  isSaving = false;
  loadingZip = false;
  deleteModal = false;
  isDeleting = false;
  employeeToDelete: any | null = null;

  data: TPagination = ResetPagination;
  employee: any | null = null;
  modal: boolean = false;
  activeTab: 'personal' | 'contract' | 'address' = 'personal';
  form: FormGroup;
  search: string = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  visiblePages: number[] = [];

  totalEmployees = 0;
  activeEmployees = 0;
  blockedEmployees = 0;
  totalRoles = 0;

  states: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  roles: string[] = [
    'Recepcionista',
    'Secretária(o)',
    'Atendente',
    'Enfermeiro(a)',
    'Técnico(a) de Enfermagem',
    'Auxiliar Administrativo',
    'Gerente',
    'Financeiro',
    'Serviços Gerais'
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
      role: ['', [Validators.required]],
      cpf: [''],
      registrationNumber: [''],
      hireDate: [''],
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

      const { data } = await api.get('/api/employees', { params });

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

  updateKPIs(employees: any[], totalCount: number) {
    this.totalEmployees = totalCount;
    this.activeEmployees = employees.filter(e => !e.blocked).length;
    this.blockedEmployees = employees.filter(e => !!e.blocked).length;
    const roleSet = new Set(employees.map(e => e.role).filter(Boolean));
    this.totalRoles = roleSet.size;
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

  setTab(tab: 'personal' | 'contract' | 'address') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  openModal(employee?: any | null) {
    this.employee = employee || null;
    this.activeTab = 'personal';

    if (employee) {
      this.form.patchValue({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        password: '',
        role: employee.role || '',
        cpf: employee.cpf || '',
        registrationNumber: employee.registrationNumber || '',
        hireDate: employee.hireDate ? employee.hireDate.substring(0, 10) : '',
        zipCode: employee.address?.zipCode || '',
        street: employee.address?.street || '',
        number: employee.address?.number || '',
        complement: employee.address?.complement || '',
        neighborhood: employee.address?.neighborhood || '',
        city: employee.address?.city || '',
        state: employee.address?.state || 'SP'
      });
    } else {
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: '',
        cpf: '',
        registrationNumber: '',
        hireDate: '',
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
    this.employee = null;
    this.modal = false;
    this.activeTab = 'personal';
    this.form.reset();
    this.cdr.detectChanges();
  }

  async saveEmployee() {
    try {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        if (this.err('name') || this.err('email') || this.err('phone')) {
          this.activeTab = 'personal';
        } else if (this.err('role')) {
          this.activeTab = 'contract';
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
        role: val.role,
        cpf: val.cpf || '',
        registrationNumber: val.registrationNumber || '',
        hireDate: val.hireDate ? new Date(val.hireDate).toISOString() : null,
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

      if (this.employee?.id) {
        payload.id = this.employee.id;
        await api.put('/api/employees', payload);
        this.toastr.success('Funcionário atualizado com sucesso!');
      } else {
        await api.post('/api/employees', payload);
        this.toastr.success('Funcionário cadastrado com sucesso!');
      }

      this.closeModal();
      await this.loadData(this.employee ? this.data.currentPage : 1);
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

  async toggleBlock(employee: any) {
    try {
      const { data } = await api.patch(`/api/employees/${employee.id}/toggle-block`);
      employee.blocked = data.data.blocked;
      this.toastr.success(data.message || (employee.blocked ? 'Funcionário bloqueado.' : 'Funcionário desbloqueado.'));
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  openDeleteModal(employee: any) {
    this.employeeToDelete = employee;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.employeeToDelete = null;
    this.deleteModal = false;
    this.cdr.detectChanges();
  }

  async confirmDelete() {
    try {
      if (!this.employeeToDelete) return;

      this.isDeleting = true;
      this.cdr.detectChanges();

      await api.delete(`/api/employees/${this.employeeToDelete.id}`);
      this.toastr.success('Funcionário removido com sucesso!');
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
