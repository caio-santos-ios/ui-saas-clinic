import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';
import { NgxCurrencyDirective } from 'ngx-currency';

@Component({
  selector: 'app-procedures',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective],
  templateUrl: './procedures.html',
  styleUrl: './procedures.css'
})
export class Procedures implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;

  data: TPagination = ResetPagination;
  search: string = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  visiblePages: number[] = [];

  modal = false;
  deleteModal = false;

  editingProcedure: any | null = null;
  procedureToDelete: any | null = null;
  form: FormGroup;

  totalProcedures = 0;
  activeProcedures = 0;
  inactiveProcedures = 0;
  avgPrice = 0;

  durations = [15, 20, 30, 40, 45, 50, 60, 90, 120, 180];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public global: GlobalService
  ) {
    this.form = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: [''],
      durationMinutes: [30, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      active: [true]
    });
  }

  ngOnInit() {
    this.loadData(1);
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
        params.active = true;
      } else if (this.statusFilter === 'inactive') {
        params.active = false;
      }

      const { data } = await api.get('/api/procedures', { params });

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

  updateKPIs(list: any[], totalCount: number) {
    this.totalProcedures = totalCount;
    this.activeProcedures = list.filter((p: any) => p.active !== false).length;
    this.inactiveProcedures = list.filter((p: any) => p.active === false).length;

    if (list.length > 0) {
      const sum = list.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
      this.avgPrice = sum / list.length;
    } else {
      this.avgPrice = 0;
    }
  }

  onSearch() {
    this.loadData(1);
  }

  clearSearch() {
    this.search = '';
    this.statusFilter = 'all';
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

  openModal(procedure: any = null) {
    if (procedure) {
      this.editingProcedure = procedure;
      this.form.patchValue({
        id: procedure.id || procedure._id,
        name: procedure.name || '',
        code: procedure.code || '',
        durationMinutes: procedure.durationMinutes || 30,
        price: procedure.price || 0,
        description: procedure.description || '',
        active: procedure.active !== false
      });
    } else {
      this.editingProcedure = null;
      this.form.reset({
        id: '',
        name: '',
        code: '',
        durationMinutes: 30,
        price: 0,
        description: '',
        active: true
      });
    }
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.editingProcedure = null;
  }

  openDeleteModal(procedure: any) {
    this.procedureToDelete = procedure;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModal = false;
    this.procedureToDelete = null;
  }

  async confirmDelete() {
    if (!this.procedureToDelete) return;

    try {
      this.isDeleting = true;
      this.cdr.detectChanges();

      const id = this.procedureToDelete.id || this.procedureToDelete._id;
      const { data } = await api.delete(`/api/procedures/${id}`);

      this.toastr.success(data?.message || 'Procedimento excluído com sucesso.');
      this.closeDeleteModal();
      this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  async toggleStatus(procedure: any) {
    try {
      const id = procedure.id || procedure._id;
      const { data } = await api.patch(`/api/procedures/${id}/status`, {});
      this.toastr.success(data?.message || 'Status alterado com sucesso.');
      procedure.active = !procedure.active;
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Campo obrigatório';
    if (c.errors['minlength']) return `Mínimo de ${c.errors['minlength'].requiredLength} caracteres`;
    if (c.errors['min']) return 'Valor inválido';
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
      const payload: any = {
        name: raw.name?.trim(),
        code: raw.code?.trim() || '',
        durationMinutes: Number(raw.durationMinutes) || 30,
        price: Number(raw.price) || 0,
        description: raw.description?.trim() || '',
        active: !!raw.active
      };

      if (this.editingProcedure) {
        payload.id = this.editingProcedure.id || this.editingProcedure._id;
        const { data } = await api.put('/api/procedures', payload);
        this.toastr.success(data?.message || 'Procedimento atualizado com sucesso.');
      } else {
        const { data } = await api.post('/api/procedures', payload);
        this.toastr.success(data?.message || 'Procedimento criado com sucesso.');
      }

      this.closeModal();
      this.loadData(this.editingProcedure ? this.data.currentPage : 1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  getStatusBadgeClass(active?: boolean): string {
    return active !== false
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
  }
}
