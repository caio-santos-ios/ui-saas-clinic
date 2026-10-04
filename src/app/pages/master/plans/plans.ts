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
  selector: 'app-master-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective],
  templateUrl: './plans.html',
  styleUrl: './plans.css'
})
export class MasterPlans implements OnInit {
  isLoading = false;
  isSaving = false;
  deleteModal = false;
  isDeleting = false;
  planToDelete: any | null = null;

  data: TPagination = ResetPagination;
  editingPlan: any | null = null;
  modal: boolean = false;
  activeTab: 'general' | 'limits' | 'features' = 'general';
  form: FormGroup;
  search: string = '';
  visiblePages: number[] = [];

  featuresList: string[] = [];
  newFeatureInput: string = '';

  totalPlans = 0;
  activePlans = 0;
  avgPrice = 0;

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      trialDays: [0, [Validators.required, Validators.min(0)]],
      limits: this.fb.group({
        maxPatients: [0, [Validators.required, Validators.min(0)]],
        maxDoctors: [0, [Validators.required, Validators.min(0)]],
        maxStaff: [0, [Validators.required, Validators.min(0)]],
      }),
      active: [true]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData(page: number = 1) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const params: any = { page, pageSize: 10, deleted: false };
      if (this.search.trim()) {
        params['regex$name'] = this.search.trim();
      }

      const { data } = await api.get('/api/plans', { params });

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

  updateKPIs(plans: any[], totalCount: number) {
    this.totalPlans = totalCount;
    this.activePlans = plans.filter(p => p.active !== false).length;
    if (plans.length > 0) {
      const sum = plans.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
      this.avgPrice = Math.round(sum / plans.length);
    } else {
      this.avgPrice = 0;
    }
  }

  onSearch() {
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

  setTab(tab: 'general' | 'limits' | 'features') {
    this.activeTab = tab;
  }

  openModal(plan?: any) {
    if (plan) {
      this.editingPlan = plan;
      this.form.patchValue({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price ?? 0,
        trialDays: plan.trialDays ?? 0,
        limits: {
          maxPatients: plan.limits?.maxPatients ?? 0,
          maxDoctors: plan.limits?.maxDoctors ?? 0,
          maxStaff: plan.limits?.maxStaff ?? 0,
        },
        active: plan.active !== false
      });
      this.featuresList = Array.isArray(plan.features) ? [...plan.features] : [];
    } else {
      this.editingPlan = null;
      this.form.reset({
        name: '',
        description: '',
        price: 0,
        trialDays: 0,
        limits: {
          maxPatients: 0,
          maxDoctors: 0,
          maxStaff: 0,
        },
        active: true
      });
      this.featuresList = [];
    }

    this.newFeatureInput = '';
    this.activeTab = 'general';
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.editingPlan = null;
    this.newFeatureInput = '';
    this.featuresList = [];
    this.form.reset();
  }

  addFeature() {
    const val = this.newFeatureInput.trim();
    if (val && !this.featuresList.includes(val)) {
      this.featuresList.push(val);
      this.newFeatureInput = '';
      this.cdr.detectChanges();
    }
  }

  removeFeature(index: number) {
    this.featuresList.splice(index, 1);
    this.cdr.detectChanges();
  }

  async savePlan() {
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
        description: val.description || '',
        price: Number(val.price) || 0,
        trialDays: Number(val.trialDays) || 0,
        limits: {
          maxPatients: Number(val.limits.maxPatients) || 0,
          maxDoctors: Number(val.limits.maxDoctors) || 0,
          maxStaff: Number(val.limits.maxStaff) || 0,
        },
        features: this.featuresList,
        active: val.active
      };

      if (this.editingPlan) {
        payload.id = this.editingPlan.id;
        const { data } = await api.put('/api/plans', payload);
        this.toastr.success(data?.message || 'Plano atualizado com sucesso.');
      } else {
        const { data } = await api.post('/api/plans', payload);
        this.toastr.success(data?.message || 'Plano criado com sucesso.');
      }

      this.closeModal();
      await this.loadData(this.data.currentPage);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async toggleActive(plan: any) {
    try {
      const nextStatus = !plan.active;
      const { data } = await api.put('/api/plans', { id: plan.id, active: nextStatus });
      plan.active = nextStatus;
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.toastr.success(data?.message || `Plano ${nextStatus ? 'ativado' : 'desativado'} com sucesso.`);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  openDeleteModal(plan: any) {
    this.planToDelete = plan;
    this.deleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.planToDelete = null;
    this.deleteModal = false;
  }

  async confirmDelete() {
    if (!this.planToDelete) return;

    try {
      this.isDeleting = true;
      this.cdr.detectChanges();

      const { data } = await api.delete(`/api/plans/${this.planToDelete.id}`);
      this.toastr.success(data?.message || 'Plano removido com sucesso.');
      this.closeDeleteModal();
      await this.loadData(1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isDeleting = false;
      this.cdr.detectChanges();
    }
  }

  err(controlPath: string): string | null {
    const control = this.form.get(controlPath);
    if (!control || !control.invalid || !control.touched) return null;
    if (control.errors?.['required']) return 'Campo obrigatório';
    if (control.errors?.['minlength']) return `Mínimo de ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors?.['min']) return `Valor mínimo: ${control.errors['min'].min}`;
    return 'Campo inválido';
  }
}
