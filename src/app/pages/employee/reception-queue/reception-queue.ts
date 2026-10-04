import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgxCurrencyDirective } from 'ngx-currency';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';
import { PhonePipe } from '../../../pipes/phone.pipe';

@Component({
  selector: 'app-reception-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, NgxCurrencyDirective, PhonePipe],
  templateUrl: './reception-queue.html',
  styleUrl: './reception-queue.css'
})
export class ReceptionQueue implements OnInit {
  isLoading = false;
  isSaving = false;

  data: TPagination = ResetPagination;
  search: string = '';
  dateFilter: string = '';
  statusFilter: string = 'all';
  visiblePages: number[] = [];

  todayTotal = 0;
  waitingCount = 0;
  inProgressCount = 0;
  completedCount = 0;

  modal = false;
  form: FormGroup;

  patients: any[] = [];
  doctors: any[] = [];
  procedures: any[] = [];

  statuses: { label: string; value: string; color: string }[] = [
    { label: 'Agendado', value: 'AGENDADO', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    { label: 'Confirmado / Esperando', value: 'CONFIRMADO', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    { label: 'Em Consulta', value: 'EM_ATENDIMENTO', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    { label: 'Concluído', value: 'CONCLUIDO', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    { label: 'Cancelado', value: 'CANCELADO', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    { label: 'Faltou', value: 'FALTOU', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
  ];

  timeSlots: string[] = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00'
  ];

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      patientId: ['', [Validators.required]],
      doctorId: ['', [Validators.required]],
      procedureId: ['', [Validators.required]],
      date: ['', [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['09:30'],
      status: ['AGENDADO', [Validators.required]],
      notes: [''],
      price: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.dateFilter = new Date().toISOString().substring(0, 10);
    this.loadSelects();
    this.loadData();
  }

  async loadSelects() {
    try {
      const [patResp, docResp, procResp] = await Promise.all([
        api.get('/api/patients/select'),
        api.get('/api/doctors/select'),
        api.get('/api/procedures/select')
      ]);

      if (patResp.data?.data) this.patients = patResp.data.data;
      if (docResp.data?.data) this.doctors = docResp.data.data;
      if (procResp.data?.data) this.procedures = procResp.data.data;
    } catch (error) {
      this.global.errorNotification(error);
    }
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

      if (this.dateFilter) {
        params.date = this.dateFilter;
      }

      if (this.statusFilter !== 'all') {
        params.status = this.statusFilter;
      }

      const { data } = await api.get('/api/appointments', { params });

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
    this.waitingCount = appointments.filter(a => a.status === 'CONFIRMADO').length;
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

  async checkIn(app: any) {
    try {
      await api.patch(`/api/appointments/${app.id}/status`, { status: 'CONFIRMADO' });
      app.status = 'CONFIRMADO';
      this.toastr.success(`Check-in de ${app.patientName} realizado. Paciente aguardando na recepção.`);
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

  async markCancelled(app: any) {
    try {
      await api.patch(`/api/appointments/${app.id}/status`, { status: 'CANCELADO' });
      app.status = 'CANCELADO';
      this.toastr.warning(`Agendamento cancelado.`);
      this.updateKPIs(this.data.data, this.data.totalCount);
      this.cdr.detectChanges();
    } catch (error) {
      this.global.errorNotification(error);
    }
  }

  onProcedureChange() {
    const procId = this.form.get('procedureId')?.value;
    const proc = this.procedures.find(p => p.id === procId || p._id === procId);
    if (proc) {
      if (proc.price && (!this.form.get('price')?.value || this.form.get('price')?.value === 0)) {
        this.form.patchValue({ price: proc.price });
      }
      this.recalculateEndTime();
    }
  }

  recalculateEndTime() {
    const procId = this.form.get('procedureId')?.value;
    const startTime = this.form.get('startTime')?.value;
    const proc = this.procedures.find(p => p.id === procId || p._id === procId);
    const duration = proc?.durationMinutes || 30;

    if (startTime) {
      const [h, m] = startTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + duration;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      const formatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      this.form.patchValue({ endTime: formatted });
    }
  }

  openModal() {
    const today = new Date().toISOString().substring(0, 10);
    this.form.reset({
      patientId: '',
      doctorId: '',
      procedureId: '',
      date: today,
      startTime: '09:00',
      endTime: '09:30',
      status: 'CONFIRMADO',
      notes: '',
      price: 0
    });
    this.modal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modal = false;
    this.form.reset();
    this.cdr.detectChanges();
  }

  async saveAppointment() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      this.isSaving = true;
      this.cdr.detectChanges();

      const val = this.form.value;
      const payload: any = {
        patientId: val.patientId,
        doctorId: val.doctorId,
        procedureId: val.procedureId,
        date: new Date(val.date).toISOString(),
        startTime: val.startTime,
        endTime: val.endTime,
        status: val.status,
        notes: val.notes || '',
        price: Number(val.price) || 0
      };

      await api.post('/api/appointments', payload);
      this.toastr.success('Agendamento criado com sucesso!');
      this.closeModal();
      await this.loadData(1);
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  getStatusBadge(status: string): string {
    const s = this.statuses.find(st => st.value === status);
    return s ? s.color : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }

  err(name: string): string | null {
    const c = this.form.get(name);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required']) return 'Campo obrigatório';
    if (c.errors?.['min']) return 'Valor inválido';
    return 'Campo inválido';
  }
}
