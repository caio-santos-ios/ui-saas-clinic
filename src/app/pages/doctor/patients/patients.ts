import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../../components/loading/loading';
import { GlobalService } from '../../../services/global.service';
import { api } from '../../../services/api';
import { ResetPagination, TPagination } from '../../../types/pagination.type';
import { PhonePipe } from '../../../pipes/phone.pipe';

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loading, PhonePipe],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class DoctorPatients implements OnInit {
  isLoading = false;
  isSavingNotes = false;
  data: TPagination = ResetPagination;
  search: string = '';
  visiblePages: number[] = [];

  patientModal = false;
  activePatient: any | null = null;
  patientHistory: any[] = [];
  loadingHistory = false;

  notesForm: FormGroup;

  totalPatients = 0;

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.notesForm = this.fb.group({
      notes: ['']
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

      const { data } = await api.get('/api/patients', { params });

      if (data?.data) {
        this.data = data.data;
        this.totalPatients = this.data.totalCount;
        this.updateVisiblePages();
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch() {
    this.loadData(1);
  }

  clearSearch() {
    this.search = '';
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

  async openPatientModal(patient: any) {
    this.activePatient = patient;
    this.notesForm.patchValue({
      notes: patient.notes || ''
    });
    this.patientModal = true;
    this.cdr.detectChanges();
    await this.loadPatientHistory(patient.id);
  }

  closePatientModal() {
    this.patientModal = false;
    this.activePatient = null;
    this.patientHistory = [];
    this.cdr.detectChanges();
  }

  async loadPatientHistory(patientId: string) {
    try {
      this.loadingHistory = true;
      this.cdr.detectChanges();

      const { data } = await api.get('/api/appointments', {
        params: {
          patientId,
          pageSize: 10,
          deleted: false
        }
      });

      if (data?.data?.data) {
        this.patientHistory = data.data.data;
      }
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.loadingHistory = false;
      this.cdr.detectChanges();
    }
  }

  async saveNotes() {
    if (!this.activePatient) return;

    try {
      this.isSavingNotes = true;
      this.cdr.detectChanges();

      const notes = this.notesForm.get('notes')?.value;
      await api.put('/api/patients', {
        id: this.activePatient.id,
        notes
      });

      this.activePatient.notes = notes;
      this.toastr.success('Observações clínicas atualizadas com sucesso!');
    } catch (error) {
      this.global.errorNotification(error);
    } finally {
      this.isSavingNotes = false;
      this.cdr.detectChanges();
    }
  }
}
