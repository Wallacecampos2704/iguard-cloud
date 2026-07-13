export type EquipmentStatus = "online" | "attention" | "offline";

export interface Equipment {
  id: string;
  name: string;
  client: string;
  type: string;
  ip: string;
  status: EquipmentStatus;
  lastCheck: string;
  uptime: string;
}

export interface Incident {
  id: string;
  title: string;
  client: string;
  equipment: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "investigating" | "resolved";
  createdAt: string;
}

export const dashboardStats = {
  activeClients: 47,
  monitoredEquipment: 312,
  online: 289,
  attention: 14,
  offline: 9,
  openIncidents: 6,
  monthlyRevenue: 28450,
  expiringTrials: 3,
  alertsSent: 1247,
  healthScore: 94,
};

export const equipmentList: Equipment[] = [
  {
    id: "eq-001",
    name: "DVR Principal",
    client: "Condomínio Solar",
    type: "CFTV",
    ip: "192.168.1.101",
    status: "online",
    lastCheck: "há 30s",
    uptime: "99.8%",
  },
  {
    id: "eq-002",
    name: "Controladora Acesso",
    client: "Edifício Central",
    type: "Controle de Acesso",
    ip: "192.168.2.45",
    status: "online",
    lastCheck: "há 45s",
    uptime: "99.5%",
  },
  {
    id: "eq-003",
    name: "Servidor NVR",
    client: "Indústria Metalúrgica",
    type: "CFTV",
    ip: "10.0.0.12",
    status: "attention",
    lastCheck: "há 2min",
    uptime: "97.2%",
  },
  {
    id: "eq-004",
    name: "Portaria Remota",
    client: "Residencial Parque",
    type: "Interfone/IP",
    ip: "192.168.5.88",
    status: "offline",
    lastCheck: "há 15min",
    uptime: "82.1%",
  },
  {
    id: "eq-005",
    name: "Switch Core",
    client: "Shopping Plaza",
    type: "Rede",
    ip: "10.10.1.1",
    status: "online",
    lastCheck: "há 20s",
    uptime: "99.9%",
  },
  {
    id: "eq-006",
    name: "Câmera Perimetral",
    client: "Galpão Logístico",
    type: "CFTV",
    ip: "192.168.10.22",
    status: "attention",
    lastCheck: "há 5min",
    uptime: "95.0%",
  },
  {
    id: "eq-007",
    name: "Central Alarme",
    client: "Escritório Advocacia",
    type: "Alarme",
    ip: "192.168.3.15",
    status: "online",
    lastCheck: "há 35s",
    uptime: "99.7%",
  },
  {
    id: "eq-008",
    name: "DVR Secundário",
    client: "Condomínio Solar",
    type: "CFTV",
    ip: "192.168.1.102",
    status: "offline",
    lastCheck: "há 8min",
    uptime: "78.4%",
  },
];

export const incidentsList: Incident[] = [
  {
    id: "inc-001",
    title: "DVR offline — sem resposta ICMP",
    client: "Residencial Parque",
    equipment: "Portaria Remota",
    severity: "critical",
    status: "open",
    createdAt: "há 15 min",
  },
  {
    id: "inc-002",
    title: "Disco com 92% de uso",
    client: "Indústria Metalúrgica",
    equipment: "Servidor NVR",
    severity: "warning",
    status: "investigating",
    createdAt: "há 1h",
  },
  {
    id: "inc-003",
    title: "Perda de frames na câmera 04",
    client: "Galpão Logístico",
    equipment: "Câmera Perimetral",
    severity: "warning",
    status: "open",
    createdAt: "há 2h",
  },
  {
    id: "inc-004",
    title: "DVR secundário sem heartbeat",
    client: "Condomínio Solar",
    equipment: "DVR Secundário",
    severity: "critical",
    status: "investigating",
    createdAt: "há 3h",
  },
  {
    id: "inc-005",
    title: "Atualização de firmware pendente",
    client: "Edifício Central",
    equipment: "Controladora Acesso",
    severity: "info",
    status: "open",
    createdAt: "há 6h",
  },
];

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "trial" | "inactive";
  equipment: number;
  createdAt: string;
  lastActivity: string;
}

export const clientsList: Client[] = [
  {
    id: "cli-001",
    name: "Condomínio Solar",
    email: "contato@condominiossolar.com.br",
    phone: "(11) 3456-7890",
    plan: "professional",
    status: "active",
    equipment: 8,
    createdAt: "2023-01-15",
    lastActivity: "há 2min",
  },
  {
    id: "cli-002",
    name: "Edifício Central",
    email: "admin@edificiocentral.com.br",
    phone: "(11) 2345-6789",
    plan: "enterprise",
    status: "active",
    equipment: 24,
    createdAt: "2023-02-01",
    lastActivity: "há 5min",
  },
  {
    id: "cli-003",
    name: "Indústria Metalúrgica",
    email: "seguranca@metalurgica.com.br",
    phone: "(31) 9876-5432",
    plan: "professional",
    status: "active",
    equipment: 16,
    createdAt: "2023-03-10",
    lastActivity: "há 1h",
  },
  {
    id: "cli-004",
    name: "Residencial Parque",
    email: "portaria@resparque.com.br",
    phone: "(21) 7654-3210",
    plan: "starter",
    status: "trial",
    equipment: 5,
    createdAt: "2024-11-01",
    lastActivity: "há 30min",
  },
  {
    id: "cli-005",
    name: "Shopping Plaza",
    email: "seguranca@shoppingplaza.com.br",
    phone: "(85) 9988-7766",
    plan: "enterprise",
    status: "active",
    equipment: 32,
    createdAt: "2023-05-20",
    lastActivity: "há 10min",
  },
  {
    id: "cli-006",
    name: "Galpão Logístico",
    email: "operacional@galpaoLog.com.br",
    phone: "(47) 5555-1111",
    plan: "professional",
    status: "active",
    equipment: 12,
    createdAt: "2023-07-08",
    lastActivity: "há 45min",
  },
];

export interface Alert {
  id: string;
  title: string;
  client: string;
  equipment: string;
  type: "system" | "performance" | "security" | "maintenance";
  priority: "critical" | "high" | "medium" | "low";
  timestamp: string;
  read: boolean;
}

export const alertsList: Alert[] = [
  {
    id: "alr-001",
    title: "Falha de conectividade detectada",
    client: "Residencial Parque",
    equipment: "Portaria Remota",
    type: "system",
    priority: "critical",
    timestamp: "há 5min",
    read: false,
  },
  {
    id: "alr-002",
    title: "CPU acima de 85%",
    client: "Indústria Metalúrgica",
    equipment: "Servidor NVR",
    type: "performance",
    priority: "high",
    timestamp: "há 12min",
    read: false,
  },
  {
    id: "alr-003",
    title: "Tentativa de acesso não autorizado",
    client: "Shopping Plaza",
    equipment: "Controladora Acesso",
    type: "security",
    priority: "critical",
    timestamp: "há 1h",
    read: true,
  },
  {
    id: "alr-004",
    title: "Backup não completado",
    client: "Condomínio Solar",
    equipment: "DVR Principal",
    type: "maintenance",
    priority: "medium",
    timestamp: "há 3h",
    read: true,
  },
  {
    id: "alr-005",
    title: "Temperatura do equipamento elevada",
    client: "Edifício Central",
    equipment: "Switch Core",
    type: "performance",
    priority: "high",
    timestamp: "há 2h",
    read: true,
  },
];

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: string;
  read: boolean;
}

export const notificationsList: Notification[] = [
  {
    id: "not-001",
    title: "Sistema em manutenção",
    message: "Manutenção programada para 02:00 - 04:00 (madrugada de quinta)",
    type: "warning",
    timestamp: "há 30min",
    read: false,
  },
  {
    id: "not-002",
    title: "Novo recurso disponível",
    message: "Relatório automático por email agora está disponível para todos os planos",
    type: "success",
    timestamp: "há 2h",
    read: true,
  },
  {
    id: "not-003",
    title: "Atualização de segurança",
    message: "Patch de segurança crítica aplicado em todos os servidores",
    type: "success",
    timestamp: "há 6h",
    read: true,
  },
  {
    id: "not-004",
    title: "Promoção especial",
    message: "Upgrade para plano Professional com 30% off por tempo limitado",
    type: "info",
    timestamp: "há 1d",
    read: true,
  },
];

export interface Invoice {
  id: string;
  client: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  issueDate: string;
  period: string;
}

export const invoicesList: Invoice[] = [
  {
    id: "inv-001",
    client: "Condomínio Solar",
    amount: 890.00,
    status: "paid",
    dueDate: "2024-12-05",
    issueDate: "2024-11-05",
    period: "Novembro 2024",
  },
  {
    id: "inv-002",
    client: "Edifício Central",
    amount: 2890.00,
    status: "paid",
    dueDate: "2024-12-10",
    issueDate: "2024-11-10",
    period: "Novembro 2024",
  },
  {
    id: "inv-003",
    client: "Indústria Metalúrgica",
    amount: 1590.00,
    status: "pending",
    dueDate: "2024-12-15",
    issueDate: "2024-11-15",
    period: "Novembro 2024",
  },
  {
    id: "inv-004",
    client: "Shopping Plaza",
    amount: 3290.00,
    status: "pending",
    dueDate: "2024-12-20",
    issueDate: "2024-11-20",
    period: "Novembro 2024",
  },
  {
    id: "inv-005",
    client: "Galpão Logístico",
    amount: 1290.00,
    status: "overdue",
    dueDate: "2024-10-30",
    issueDate: "2024-10-01",
    period: "Outubro 2024",
  },
];

export interface HelpArticle {
  id: string;
  title: string;
  category: "getting-started" | "troubleshooting" | "features" | "billing";
  description: string;
  views: number;
}

export const helpArticles: HelpArticle[] = [
  {
    id: "help-001",
    title: "Como adicionar um novo equipamento",
    category: "getting-started",
    description: "Guia passo a passo para registrar um novo equipamento no iGuard",
    views: 1247,
  },
  {
    id: "help-002",
    title: "Configurar alertas e notificações",
    category: "features",
    description: "Aprenda a personalizar quais alertas você deseja receber e como",
    views: 892,
  },
  {
    id: "help-003",
    title: "Resolvendo problemas de conectividade",
    category: "troubleshooting",
    description: "Dicas para diagnosticar e resolver problemas de conexão com equipamentos",
    views: 654,
  },
  {
    id: "help-004",
    title: "Entendendo relatórios de disponibilidade",
    category: "features",
    description: "Como interpretar e usar os relatórios de uptime do seu sistema",
    views: 523,
  },
  {
    id: "help-005",
    title: "Planos e preços explicados",
    category: "billing",
    description: "Comparação entre planos Starter, Professional e Enterprise",
    views: 789,
  },
];

export interface AlertContact {
  id: string;
  name: string;
  role: string;
  whatsapp: string;
  email: string;
  telegram: string;
  receiveCritical: boolean;
  receiveRecovery: boolean;
  receiveFinancial: boolean;
  status: "active" | "inactive";
}

export const alertContacts: AlertContact[] = [
  {
    id: "cont-001",
    name: "João Silva",
    role: "Gerente Técnico",
    whatsapp: "(11) 98765-4321",
    email: "joao@example.com",
    telegram: "@joaosilva",
    receiveCritical: true,
    receiveRecovery: true,
    receiveFinancial: false,
    status: "active",
  },
  {
    id: "cont-002",
    name: "Maria Santos",
    role: "Responsável Financeiro",
    whatsapp: "(11) 99999-8888",
    email: "maria@example.com",
    telegram: "@mariasantos",
    receiveCritical: false,
    receiveRecovery: false,
    receiveFinancial: true,
    status: "active",
  },
  {
    id: "cont-003",
    name: "Carlos Oliveira",
    role: "Diretor Operacional",
    whatsapp: "(11) 97654-3210",
    email: "carlos@example.com",
    telegram: "@carlosoliveira",
    receiveCritical: true,
    receiveRecovery: true,
    receiveFinancial: true,
    status: "active",
  },
];

export interface MessageTemplate {
  id: string;
  name: string;
  category: "technical" | "client" | "critical" | "recovery" | "financial";
  content: string;
  variables: string[];
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: "msg-001",
    name: "Mensagem Técnica para Integrador",
    category: "technical",
    content: "⚠️ ALERTA TÉCNICO\n\nCliente: {{cliente}}\nEquipamento: {{equipamento}}\nProblema: {{problema}}\nTempo: {{timestamp}}\n\nAção necessária: {{acao}}\n\nConsulte o dashboard para mais detalhes.",
    variables: ["cliente", "equipamento", "problema", "timestamp", "acao"],
  },
  {
    id: "msg-002",
    name: "Mensagem para Síndico/Cliente Final",
    category: "client",
    content: "🔔 NOTIFICAÇÃO DE SEGURANÇA\n\nDetectamos uma situação em {{local}}:\n{{descricao}}\n\nNossos técnicos foram acionados.\nVocê será atualizado em breve.\n\nContato suporte: (11) 98765-4321",
    variables: ["local", "descricao"],
  },
  {
    id: "msg-003",
    name: "Mensagem Crítica",
    category: "critical",
    content: "🚨 ALERTA CRÍTICO\n\n{{equipamento}} está {{status}}\nÚltima atividade: {{lastActivity}}\n\n⏰ AÇÃO IMEDIATA NECESSÁRIA\n\nContate o suporte: (11) 98765-4321",
    variables: ["equipamento", "status", "lastActivity"],
  },
  {
    id: "msg-004",
    name: "Mensagem de Recuperação",
    category: "recovery",
    content: "✅ SISTEMA RECUPERADO\n\n{{equipamento}} está online novamente.\nUptime: {{uptime}}\nTempo de inatividade: {{downtime}}\n\nTudo está funcionando normalmente.",
    variables: ["equipamento", "uptime", "downtime"],
  },
  {
    id: "msg-005",
    name: "Mensagem Financeira/Trial Vencido",
    category: "financial",
    content: "💳 ATENÇÃO: Trial expirando\n\nSeu período de teste vence em {{dias}} dias.\nEquipamentos monitorados: {{equipamentos}}/3\n\nAtualize para um plano pago para continuar desfrutando do iGuard.\n\nUpgrade agora: {{link}}",
    variables: ["dias", "equipamentos", "link"],
  },
];

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  maxEquipments: number;
  isTrial: boolean;
}

export const plans: Plan[] = [
  {
    id: "plan-trial",
    name: "Trial",
    price: 0,
    period: "10 dias grátis",
    features: ["Até 3 equipamentos", "Alertas básicos", "Suporte por email"],
    maxEquipments: 3,
    isTrial: true,
  },
  {
    id: "plan-starter",
    name: "Starter",
    price: 299.90,
    period: "mensal",
    features: [
      "Até 10 equipamentos",
      "Alertas avançados",
      "Relatórios básicos",
      "Suporte prioritário",
    ],
    maxEquipments: 10,
    isTrial: false,
  },
  {
    id: "plan-pro",
    name: "Pro",
    price: 799.90,
    period: "mensal",
    features: [
      "Até 50 equipamentos",
      "Alertas + SMS/WhatsApp",
      "Relatórios detalhados",
      "Webhook de integração",
      "Suporte 24/7",
    ],
    maxEquipments: 50,
    isTrial: false,
  },
  {
    id: "plan-master",
    name: "Master",
    price: 1999.90,
    period: "mensal",
    features: [
      "Equipamentos ilimitados",
      "Alertas + SMS/WhatsApp/Telegram",
      "Relatórios customizados",
      "API completa",
      "Webhook avançado",
      "Suporte dedicado",
      "SLA 99.9%",
    ],
    maxEquipments: 999,
    isTrial: false,
  },
];

export interface PlatformStats {
  mrrRecurrenceRevenue: number;
  totalReceived: number;
  totalPending: number;
  activeClients: number;
  activeTrials: number;
  expiredTrials: number;
  delinquent: number;
  monitoredEquipment: number;
  alertsSent: number;
  mrr: number;
  churn: number;
  healthScore: number;
}

export const platformStats: PlatformStats = {
  mrrRecurrenceRevenue: 28450,
  totalReceived: 142250,
  totalPending: 8900,
  activeClients: 47,
  activeTrials: 12,
  expiredTrials: 3,
  delinquent: 2,
  monitoredEquipment: 312,
  alertsSent: 1247,
  mrr: 28450,
  churn: 5.3,
  healthScore: 94,
};

export interface OrganizationStats {
  id: string;
  name: string;
  plan: "trial" | "starter" | "pro" | "master";
  status: "active" | "trial" | "inactive" | "delinquent";
  equipments: number;
  incidents: number;
  trialEndsAt?: string;
  monthlyValue: number;
}

export const organizationsList: OrganizationStats[] = [
  {
    id: "org-001",
    name: "Condomínio Solar",
    plan: "pro",
    status: "active",
    equipments: 8,
    incidents: 2,
    monthlyValue: 799.90,
  },
  {
    id: "org-002",
    name: "Edifício Central",
    plan: "master",
    status: "active",
    equipments: 24,
    incidents: 1,
    monthlyValue: 1999.90,
  },
  {
    id: "org-003",
    name: "Indústria Metalúrgica",
    plan: "pro",
    status: "active",
    equipments: 16,
    incidents: 4,
    monthlyValue: 799.90,
  },
  {
    id: "org-004",
    name: "Residencial Parque",
    plan: "trial",
    status: "trial",
    equipments: 5,
    incidents: 3,
    trialEndsAt: "2024-12-15",
    monthlyValue: 0,
  },
  {
    id: "org-005",
    name: "Shopping Plaza",
    plan: "master",
    status: "active",
    equipments: 32,
    incidents: 0,
    monthlyValue: 1999.90,
  },
  {
    id: "org-006",
    name: "Galpão Logístico",
    plan: "starter",
    status: "delinquent",
    equipments: 12,
    incidents: 5,
    monthlyValue: 299.90,
  },
];
