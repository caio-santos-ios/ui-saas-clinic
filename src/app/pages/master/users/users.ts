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
  selector: 'app-master-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxMaskDirective, NgxMaskPipe],
  providers: [provideNgxMask()],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class MasterUsers implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  showPassword = false;

  data: TPagination = ResetPagination;
  clinicsList: any[] = [];
  search: string = '';
  statusFilter: 'all' | 'active' | 'blocked' = 'all';
  clinicFilter: string = '';
  visiblePages: number[] = [];

  modal = false;
  deleteModal = false;

  editingUser: any | null = null;
  userToDelete: any | null = null;

  form: FormGroup;

  totalAdmins = 0;
  activeAdmins = 0;
  blockedAdmins = 0;
  clinicsWithAdmin = 0;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      clinicId: ['', [Validators.required]],
      password: [''],
      blocked: [false]
    });
  }

  ngOnInit() {
    this.loadClinics();
    this.loadData(1);
  }

  getRawId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val.$oid) return val.$oid;
    if (val._id) return this.getRawId(val._id);
    if (val.id) return this.getRawId(val.id);
    return String(val);
  }

  async loadClinics() {
    try {
      const { data } = await api.get('/api/clinics/select', {
        params: { deleted: false, active: true }
      });
      this.clinicsList = data.data;
      this.cdr.detectChanges();
    } catch {
    }
  }

  async loadData(page: number = 1) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const params: any = { page, pageSize: 10, deleted: false, admin: true, accessProfile: "admin" };
      if (this.search.trim()) {
        params['regex$name'] = this.search.trim();
      }
      if (this.statusFilter === 'active') {
        params.blocked = false;
      } else if (this.statusFilter === 'blocked') {
        params.blocked = true;
      }
      if (this.clinicFilter) {
        params.clinicId = this.clinicFilter;
      }

      const { data } = await api.get('/api/users', { params });

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

  updateKPIs(users: any[], totalCount: number) {
    this.totalAdmins = totalCount;
    this.activeAdmins = users.filter(u => !u.blocked).length;
    this.blockedAdmins = users.filter(u => u.blocked).length;
    const clinicsIds = new Set(users.map(u => this.getRawId(u.clinicId)).filter(id => !!id));
    this.clinicsWithAdmin = clinicsIds.size;
  }

  onSearch() {
    this.loadData(1);
  }

  setStatusFilter(filter: 'all' | 'active' | 'blocked') {
    this.statusFilter = filter;
    this.loadData(1);
  }

  onClinicFilterChange() {
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

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async openModal(user?: any) {
    this.showPassword = false;

    if (this.clinicsList.length === 0) {
      await this.loadClinics();
    }

    if (user) {
      this.editingUser = user;
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();

      let targetUser = { ...user };
      const userId = this.getRawId(user.id || user._id);
      if (userId) {
        try {
          const { data } = await api.get(`/api/users/${userId}`);
          if (data?.data) {
            targetUser = { ...targetUser, ...data.data };
          }
        } catch {
        }
      }

      const clinicId = this.getRawId(targetUser.clinicId || targetUser.ClinicId || targetUser.clinic?.id || targetUser.clinic?._id);

      this.form.patchValue({
        name: targetUser.name || targetUser.Name || '',
        email: targetUser.email || targetUser.Email || '',
        phone: targetUser.phone || targetUser.Phone || '',
        clinicId: clinicId,
        password: '',
        blocked: targetUser.blocked === true || targetUser.Blocked === true
      });
    } else {
      this.editingUser = null;
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('password')?.updateValueAndValidity();
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        clinicId: this.clinicFilter || '',
        password: '',
        blocked: false
      });
    }
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.editingUser = null;
    this.showPassword = false;
  }

  openDeleteModal(user: any) {
    this.userToDelete = user;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModal = false;
    this.userToDelete = null;
  }

  async toggleBlock(user: any) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const userId = this.getRawId(user.id || user._id);
      const { data } = await api.patch(`/api/users/${userId}/status`);
      this.toastr.success(data?.message || 'Status alterado com sucesso.');
      user.blocked = !user.blocked;
      this.updateKPIs(this.data.data, this.data.totalCount);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async saveUser() {
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
        name: val.name,
        email: val.email,
        phone: val.phone,
        clinicId: val.clinicId,
        admin: true,
        accessProfile: "admin",
        blocked: val.blocked
      };

      if (this.editingUser) {
        payload.id = this.getRawId(this.editingUser.id || this.editingUser._id);
        if (val.password && val.password.trim()) {
          if (val.password.trim().length < 8) {
            this.toastr.warning('A senha deve ter no mínimo 8 caracteres.');
            this.isSaving = false;
            return;
          }
          payload.password = val.password.trim();
        }
        const { data } = await api.put('/api/users', payload);
        this.toastr.success(data?.message || 'Administrador atualizado com sucesso.');
      } else {
        if (!val.password || val.password.length < 8) {
          this.toastr.warning('A senha deve ter no mínimo 8 caracteres.');
          this.isSaving = false;
          return;
        }
        payload.password = val.password;
        const { data } = await api.post('/api/users', payload);
        this.toastr.success(data?.message || 'Administrador cadastrado com sucesso.');
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
    if (!this.userToDelete) return;

    try {
      this.isDeleting = true;
      this.cdr.detectChanges();

      const userId = this.getRawId(this.userToDelete.id || this.userToDelete._id);
      const { data } = await api.delete(`/api/users/${userId}`);
      this.toastr.success(data?.message || 'Administrador removido com sucesso.');
      this.closeDeleteModal();
      this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  getClinicName(user: any): string {
    if (user.clinic?.tradeName) return user.clinic.tradeName;
    const cid = this.getRawId(user.clinicId);
    const match = this.clinicsList.find(c => this.getRawId(c.id || c._id) === cid);
    return match ? match.tradeName : 'Clínica não vinculada';
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
