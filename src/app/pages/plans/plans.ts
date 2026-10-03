import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

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
export class Plans {
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  selectedPlan: PricingPlan | null = null;
  paymentMethod: PaymentMethod = 'credit_card';
  showPaymentModal = false;
  isLoading = false;
  pixCopied = false;

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
    private cdr: ChangeDetectorRef
  ) {}

  setCycle(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle = cycle;
  }

  selectPlan(plan: PricingPlan): void {
    this.selectedPlan = plan;
    this.showPaymentModal = true;
    this.pixCopied = false;
    this.cdr.detectChanges();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
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

  async confirmSubscription(): Promise<void> {
    if (!this.selectedPlan) return;

    if (this.paymentMethod === 'credit_card') {
      if (!this.cardData.number || !this.cardData.holderName || !this.cardData.expiry || !this.cardData.cvv) {
        this.toastr.warning('Preencha os dados do cartão de crédito.');
        return;
      }
    }

    if (this.paymentMethod === 'boleto') {
      if (!this.boletoData.name || !this.boletoData.document) {
        this.toastr.warning('Preencha o nome e CPF/CNPJ para emissão do boleto.');
        return;
      }
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      localStorage.setItem('selectedPlan', JSON.stringify({
        id: this.selectedPlan.id,
        name: this.selectedPlan.name,
        cycle: this.billingCycle,
        price: this.currentPrice,
        paymentMethod: this.paymentMethod
      }));

      await new Promise(resolve => setTimeout(resolve, 800));

      this.toastr.success(`Assinatura do Plano ${this.selectedPlan.name} confirmada!`);
      this.showPaymentModal = false;
      this.router.navigateByUrl('/login');
    } catch {
      this.toastr.error('Erro ao processar assinatura. Tente novamente.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
