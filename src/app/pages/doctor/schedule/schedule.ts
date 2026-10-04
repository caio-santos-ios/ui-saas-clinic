import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';
import { PhonePipe } from '../../../pipes/phone.pipe';

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, PhonePipe],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css'
})
export class DoctorSchedule implements OnInit {
  isLoading = false;
  isSavingNotes = false;
  loadingPatient = false;

  data: TPagination = ResetPagination;
  visiblePages: number[] = [];

  dateFilter: string = '';
  statusFilter: string = 'all';

  todayTotal = 0;
  waitingCount = 0;
  inProgressCount = 0;
  completedCount = 0;

  consultationModal = false;
  activeAppointment: any | null = null;
  consultationForm: FormGroup;

  patientModal = false;
  activePatient: any | null = null;

  statuses: { label: string; value: string; color: string }[] = [
    { label: 'Agendado', value: 'AGENDADO', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    { label: 'Confirmado', value: 'CONFIRMADO', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    { label: 'Em Atendimento', value: 'EM_ATENDIMENTO', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    { label: 'Concluído', value: 'CONCLUIDO', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    { label: 'Cancelado', value: 'CANCELADO', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    { label: 'Faltou', value: 'FALTOU', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
  ];

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.consultationForm = this.fb.group({
      notes: ['', [Validators.required, Validators.minLength(3)]],
      status: ['CONCLUIDO', [Validators.required]]
    });
  }

  ngOnInit() {
    const today = new Date().toISOString().substring(0, 10);
    this.dateFilter = today;
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

      if (this.statusFilter !== 'all') {
        params.status = this.statusFilter;
      }

      if (this.dateFilter) {
        params.date = this.dateFilter;
      }

      const { data } = await api.get('/api/appointments/my-appointments', { params });

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

  updateKPIs(appointments: any[], totalCount: number) {
    this.todayTotal = totalCount;
    this.waitingCount = appointments.filter(a => a.status === 'AGENDADO' || a.status === 'CONFIRMADO').length;
    this.inProgressCount = appointments.filter(a => a.status === 'EM_ATENDIMENTO').length;
    this.completedCount = appointments.filter(a => a.status === 'CONCLUIDO').length;
  }

  onFilterChange() {
    this.loadData(1);
  }

  setToday() {
    this.dateFilter = new Date().toISOString().substring(0, 10);
    this.statusFilter = 'all';
    this.loadData(1);
  }

  clearDate() {
    this.dateFilter = '';
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

  async startConsultation(app: any) {
    try {
      await api.patch(`/api/appointments/${app.id}/status`, { status: 'EM_ATENDIMENTO' });
      app.status = 'EM_ATENDIMENTO';
      this.toastr.success(`Atendimento com ${app.patientName} iniciado.`);
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  async markAbsent(app: any) {
    try {
      await api.patch(`/api/appointments/${app.id}/status`, { status: 'FALTOU' });
      app.status = 'FALTOU';
      this.toastr.info(`Paciente marcado como falta.`);
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  openConsultationModal(app: any) {
    this.activeAppointment = app;
    this.consultationForm.reset({
      notes: app.notes || '',
      status: 'CONCLUIDO'
    });
    this.consultationModal = true;
    this.cdr.detectChanges();
  }

  closeConsultationModal() {
    this.consultationModal = false;
    this.activeAppointment = null;
    this.consultationForm.reset();
    this.cdr.detectChanges();
  }

  async saveConsultation() {
    if (this.consultationForm.invalid || !this.activeAppointment) {
      this.consultationForm.markAllAsTouched();
      this.toastr.warning('Preencha as observações do prontuário.');
      return;
    }

    try {
      this.isSavingNotes = true;
      this.cdr.detectChanges();

      const val = this.consultationForm.value;
      await api.put('/api/appointments', {
        id: this.activeAppointment.id,
        notes: val.notes,
        status: val.status
      });

      this.activeAppointment.notes = val.notes;
      this.activeAppointment.status = val.status;
      this.toastr.success('Consulta registrada e concluída com sucesso!');
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.closeConsultationModal();
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSavingNotes = false;
      this.cdr.detectChanges();
    }
  }

  async viewPatient(patientId: string) {
    if (!patientId) return;

    try {
      this.loadingPatient = true;
      this.patientModal = true;
      this.activePatient = null;
      this.cdr.detectChanges();

      const { data } = await api.get(`/api/patients/${patientId}`);
      if (data?.data) {
        this.activePatient = data.data;
      }
    } catch (error) {
      this.global.errorNotification(error);
      this.closePatientModal();
    } finally {
      this.loadingPatient = false;
      this.cdr.detectChanges();
    }
  }

  closePatientModal() {
    this.patientModal = false;
    this.activePatient = null;
    this.cdr.detectChanges();
  }

  getStatusBadge(status: string): string {
    const s = this.statuses.find(st => st.value === status);
    return s ? s.color : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }
}
