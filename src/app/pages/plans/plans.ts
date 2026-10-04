import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';
import { ThemeService } from '../../services/theme';

export interface PlanFeature {
  text: string;
  highlight?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays?: number;
  isPopular?: boolean;
  color: string;
  features: PlanFeature[];
}

export type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './plans.html',
  styleUrl: './plans.css'
})
export class Plans implements OnInit, OnDestroy {
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  selectedPlan: PricingPlan | null = null;
  paymentMethod: PaymentMethod = 'credit_card';
  showPaymentModal = false;
  isLoading = false;
  pixCopied = false;
  boletoCopied = false;

  isPixWaiting = false;
  isPixConfirmed = false;
  isPixChecking = false;
  pixCountdown = 900;
  pixFormattedTime = '15:00';
  private pixTimerInterval: any = null;
  private pixPollInterval: any = null;

  isBoletoSuccess = false;
  boletoLine = '34191.79001 01043.510047 91020.150008 1 95000000000000';
  pixQrCodeImage = '';

  cardData = {
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
    document: ''
  };

  boletoData = {
    name: '',
    document: '',
    email: ''
  };

  pixCode = '00020126580014br.gov.bcb.pix0136clinicsaas-pix-f92a-4bc1-90a3-5204000053039865802BR5925CLINICSAAS TECNOLOGIA LTDA6009SAO PAULO62070503***6304E8A2';

  plans: PricingPlan[] = [];
  isLoadingPlans: boolean = true;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public auth: Auth,
    public themeService: ThemeService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    try {
      this.isLoadingPlans = true;
      this.cdr.detectChanges();

      const { data } = await api.get('/api/plans', { params: { pageSize: 50 } });
      const list = data?.data?.data || [];

      if (Array.isArray(list) && list.length > 0) {
        const palette = ['#b45309', '#dca311', '#eab308', '#0284c7', '#16a34a'];
        this.plans = list
          .filter((p: any) => p.active !== false)
          .map((p: any, idx: number) => {
            const monthly = Number(p.price) || 0;
            const yearly = Math.round(monthly * 0.8);
            const feats: PlanFeature[] = [];

            if (p.limits) {
              const maxDoctors = p.limits.maxDoctors;
              const maxPatients = p.limits.maxPatients;
              const maxStaff = p.limits.maxStaff;

              if (maxDoctors > 0) {
                feats.push({ text: `Até ${maxDoctors} ${maxDoctors === 1 ? 'médico' : 'médicos'}`, highlight: true });
              } else if (maxDoctors === 0) {
                feats.push({ text: 'Médicos ilimitados', highlight: true });
              }

              if (maxPatients > 0) {
                feats.push({ text: `Até ${maxPatients} pacientes ativos`, highlight: true });
              } else if (maxPatients === 0) {
                feats.push({ text: 'Pacientes ativos ilimitados', highlight: true });
              }

              if (maxStaff > 0) {
                feats.push({ text: `Até ${maxStaff} membros na equipe` });
              } else if (maxStaff === 0) {
                feats.push({ text: 'Equipe ilimitada' });
              }
            }

            if (Array.isArray(p.features)) {
              p.features.forEach((f: string) => {
                if (f && typeof f === 'string' && f.trim()) {
                  feats.push({ text: f.trim() });
                }
              });
            }

            return {
              id: p.id || p._id,
              name: p.name,
              tagline: p.description || '',
              monthlyPrice: monthly,
              yearlyPrice: yearly,
              trialDays: Number(p.trialDays) || 0,
              isPopular: list.length === 1 || idx === 1,
              color: palette[idx % palette.length],
              features: feats
            };
          });
      } else {
        this.plans = [];
      }
    } catch {
      this.toastr.error('Erro ao carregar os planos disponíveis.');
    } finally {
      this.isLoadingPlans = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.stopPixIntervals();
  }

  setCycle(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle = cycle;
  }

  selectPlan(plan: PricingPlan): void {
    this.selectedPlan = plan;
    this.showPaymentModal = true;
    this.pixCopied = false;
    this.boletoCopied = false;
    this.isPixWaiting = false;
    this.isPixConfirmed = false;
    this.isBoletoSuccess = false;
    this.cdr.detectChanges();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.isPixWaiting = false;
    this.isPixConfirmed = false;
    this.isBoletoSuccess = false;
    this.stopPixIntervals();
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
  }

  get currentPrice(): number {
    if (!this.selectedPlan) return 0;
    return this.billingCycle === 'monthly' ? this.selectedPlan.monthlyPrice : this.selectedPlan.yearlyPrice;
  }

  copyPix(): void {
    navigator.clipboard.writeText(this.pixCode);
    this.pixCopied = true;
    this.toastr.info('Código PIX copiado para a área de transferência!');
    setTimeout(() => {
      this.pixCopied = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  copyBoleto(): void {
    navigator.clipboard.writeText(this.boletoLine);
    this.boletoCopied = true;
    this.toastr.info('Linha digitável copiada para a área de transferência!');
    setTimeout(() => {
      this.boletoCopied = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  startPixWaiting(): void {
    this.isPixWaiting = true;
    this.isPixConfirmed = false;
    this.pixCountdown = 900;
    this.pixFormattedTime = '15:00';
    this.stopPixIntervals();

    this.pixTimerInterval = setInterval(() => {
      if (this.pixCountdown > 0) {
        this.pixCountdown--;
        this.pixFormattedTime = this.formatTime(this.pixCountdown);
        this.cdr.detectChanges();
      } else {
        this.stopPixIntervals();
      }
    }, 1000);

    this.pixPollInterval = setInterval(() => {
      this.checkPixStatus(false);
    }, 4500);
  }

  stopPixIntervals(): void {
    if (this.pixTimerInterval) {
      clearInterval(this.pixTimerInterval);
      this.pixTimerInterval = null;
    }
    if (this.pixPollInterval) {
      clearInterval(this.pixPollInterval);
      this.pixPollInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async checkPixStatus(manual: boolean = false): Promise<void> {
    if (this.isPixConfirmed) return;

    if (manual) {
      this.isPixChecking = true;
      this.cdr.detectChanges();
    }

    let isApproved = false;
    const signatureId = this.auth.getSignature() || localStorage.getItem('signatureId');

    if (signatureId) {
      try {
        const { data } = await api.get(`/api/signatures/${signatureId}`);
        if (data?.data?.status === 'ATIVO' || data?.data?.status === 'CONFIRMADO') {
          console.log(data.data.clinicSetting);
          this.auth.applyClinicTheme(data.data.clinicSetting);
          isApproved = true;
        }
      } catch {
      }
    }

    if (manual) {
      this.isPixChecking = false;
      this.cdr.detectChanges();
      if (!isApproved) {
        this.toastr.info('Pagamento ainda não confirmado. Aguarde alguns instantes.');
      }
    }

    if (isApproved) {
      this.onPixSuccess();
    }
  }

  onPixSuccess(): void {
    this.stopPixIntervals();
    this.isPixConfirmed = true;
    this.toastr.success('Pagamento via Pix confirmado com sucesso!');
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showPaymentModal = false;
      if (this.auth.isAuthenticated()) {
        this.router.navigateByUrl('/dashboard');
      } else {
        this.router.navigateByUrl('/login');
      }
    }, 2400);
  }

  goToLoginAfterBoleto(): void {
    this.showPaymentModal = false;
    this.isBoletoSuccess = false;
    this.toastr.info('Aguardando compensação bancária do boleto.');
    this.router.navigateByUrl('/login');
  }

  async confirmSubscription(): Promise<void> {
    if (!this.selectedPlan) return;

    const signatureId = this.auth.getSignature() || localStorage.getItem('signatureId') || '';
    const clinicId = localStorage.getItem('clinicId') || '';

    if (this.paymentMethod === 'pix') {
      this.isLoading = true;
      this.cdr.detectChanges();

      try {
        const { data } = await api.post('/api/signatures/subscribe', {
          signatureId,
          clinicId,
          planId: this.selectedPlan.id,
          cycle: this.billingCycle,
          paymentMethod: 'PIX'
        });

        if (data?.data?.pixCopyPaste) {
          this.pixCode = data.data.pixCopyPaste;
        }
        if (data?.data?.pixQrCode) {
          this.pixQrCodeImage = data.data.pixQrCode;
        }
        if (data?.data?.signatureId) {
          this.auth.setSignatureId(data.data.signatureId);
        }

        localStorage.setItem('selectedPlan', JSON.stringify({
          id: this.selectedPlan.id,
          name: this.selectedPlan.name,
          cycle: this.billingCycle,
          price: this.currentPrice,
          paymentMethod: 'pix'
        }));

        this.startPixWaiting();
      } catch (err: any) {
        this.toastr.error(err?.response?.data?.message || 'Erro ao gerar cobrança Pix. Tente novamente.');
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
      return;
    }

    if (this.paymentMethod === 'boleto') {
      if (!this.boletoData.name || !this.boletoData.document) {
        this.toastr.warning('Preencha o nome e CPF/CNPJ para emissão do boleto.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      try {
        const { data } = await api.post('/api/signatures/subscribe', {
          signatureId,
          clinicId,
          planId: this.selectedPlan.id,
          cycle: this.billingCycle,
          paymentMethod: 'BOLETO'
        });

        if (data?.data?.identificationField) {
          this.boletoLine = data.data.identificationField;
        }
        if (data?.data?.signatureId) {
          this.auth.setSignatureId(data.data.signatureId);
        }

        localStorage.setItem('selectedPlan', JSON.stringify({
          id: this.selectedPlan.id,
          name: this.selectedPlan.name,
          cycle: this.billingCycle,
          price: this.currentPrice,
          paymentMethod: 'boleto'
        }));

        this.isBoletoSuccess = true;
      } catch (err: any) {
        this.toastr.error(err?.response?.data?.message || 'Erro ao gerar boleto. Tente novamente.');
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
      return;
    }

    if (this.paymentMethod === 'credit_card') {
      if (!this.cardData.number || !this.cardData.holderName || !this.cardData.expiry || !this.cardData.cvv) {
        this.toastr.warning('Preencha os dados do cartão de crédito.');
        return;
      }

      this.isLoading = true;
      this.cdr.detectChanges();

      try {
        const rawExpiry = (this.cardData.expiry || '').trim();
        let expMonth = '';
        let expYear = '';

        if (rawExpiry.includes('/')) {
          const parts = rawExpiry.split('/');
          expMonth = parts[0]?.trim() || '';
          expYear = parts[1]?.trim() || '';
        } else {
          const digits = rawExpiry.replace(/\D/g, '');
          expMonth = digits.substring(0, 2);
          expYear = digits.substring(2);
        }

        if (expYear.length === 2) {
          expYear = `20${expYear}`;
        }

        const { data } = await api.post('/api/signatures/subscribe', {
          signatureId,
          clinicId,
          planId: this.selectedPlan.id,
          cycle: this.billingCycle,
          paymentMethod: 'CREDIT_CARD',
          cardData: {
            holderName: this.cardData.holderName,
            number: this.cardData.number.replace(/\s+/g, ''),
            expiryMonth: expMonth || '',
            expiryYear: expYear || '',
            cvv: this.cardData.cvv,
            holderCpfCnpj: this.cardData.document
          }
        });

        if (data?.data?.signatureId) {
          this.auth.setSignatureId(data.data.signatureId);
        }

        localStorage.setItem('selectedPlan', JSON.stringify({
          id: this.selectedPlan.id,
          name: this.selectedPlan.name,
          cycle: this.billingCycle,
          price: this.currentPrice,
          paymentMethod: 'credit_card'
        }));

        this.toastr.success(`Assinatura do Plano ${this.selectedPlan.name} confirmada!`);
        this.showPaymentModal = false;

        if (this.auth.isAuthenticated()) {
          this.router.navigateByUrl('/dashboard');
        } else {
          this.router.navigateByUrl('/login');
        }
      } catch (err: any) {
        this.toastr.error(err?.response?.data?.message || 'Erro ao processar assinatura. Tente novamente.');
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }
}
