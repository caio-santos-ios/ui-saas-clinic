import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';

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
export class Plans implements OnDestroy {
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

  plans: PricingPlan[] = [
    {
      id: 'bronze',
      name: 'Bronze',
      tagline: 'Ideal para consultórios e médicos em fase inicial.',
      monthlyPrice: 249,
      yearlyPrice: 199,
      color: '#b45309',
      features: [
        { text: 'Até 1 médico cadastrado' },
        { text: 'Até 100 pacientes ativos' },
        { text: 'Cronograma pré e pós-operatório' },
        { text: 'Chat direto com a clínica' },
        { text: 'Envio de fotos e documentos (até 5GB)' },
        { text: 'Registro de sinais vitais pelos pacientes' },
        { text: 'Suporte em horário comercial' }
      ]
    },
    {
      id: 'prata',
      name: 'Prata',
      tagline: 'O mais escolhido para clínicas em crescimento e com equipe.',
      monthlyPrice: 499,
      yearlyPrice: 399,
      isPopular: true,
      color: '#dca311',
      features: [
        { text: 'Até 5 médicos e funcionários', highlight: true },
        { text: 'Até 500 pacientes ativos', highlight: true },
        { text: 'Inteligência Artificial para dúvidas rotineiras', highlight: true },
        { text: 'Personalização do app com sua marca e cores' },
        { text: 'Envio de notificações push personalizadas' },
        { text: 'Armazenamento de exames e fotos ilimitado' },
        { text: 'Agenda integrada de consultas e retornos' },
        { text: 'Suporte prioritário via WhatsApp' }
      ]
    },
    {
      id: 'ouro',
      name: 'Ouro',
      tagline: 'Para grandes centros cirúrgicos e clínicas de alto volume.',
      monthlyPrice: 899,
      yearlyPrice: 719,
      color: '#eab308',
      features: [
        { text: 'Médicos e funcionários ilimitados', highlight: true },
        { text: 'Pacientes ativos ilimitados', highlight: true },
        { text: 'IA personalizada com protocolos próprios da clínica', highlight: true },
        { text: 'Disparo de campanhas para pacientes' },
        { text: 'Link individual de indicação de pacientes' },
        { text: 'Controle completo de acessos e permissões' },
        { text: 'Adequação total à LGPD e segurança avançada' },
        { text: 'Gerente de contas e suporte 24/7 dedicado' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    public auth: Auth
  ) { }

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
        const [expMonth, expYear] = this.cardData.expiry.split('/');

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
            expiryYear: expYear ? `20${expYear}` : '',
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
