


export enum UserRole {
  Admin = 'Admin',
  UserManager = 'User Manager',
  User = 'User/Operador',
}

export interface User {
  id: number;
  realName: string;
  username: string;
  email: string;
  role: UserRole;
  language: string;
  authentication: string;
  modulePermissions: string;
  groups: string;
  lastLogin: string;
  password?: string;
  is2FAEnabled?: boolean;
  ssoProvider?: 'google' | null;
  twoFactorSecret?: string | null;
}

export interface Equipment {
  id: number;
  equipamento: string;
  garantia: string;
  patrimonio: string;
  serial: string;
  usuarioAtual: string;
  usuarioAnterior: string;
  local: string;
  setor: string;
  dataEntregaUsuario: string;
  status: string;
  dataDevolucao: string;
  tipo: string;
  notaCompra: string;
  notaPlKm: string;
  termoResponsabilidade: string;
  foto: string;
  qrCode: string;
}


export interface EquipmentHistory {
  id: number;
  equipmentId: number;
  changeType: 'Localização' | 'Usuário' | 'Setor' | 'Status';
  from_value: string;
  to_value: string;
  changedBy: string; // username
  timestamp: string;
}

export interface License {
    id: number;
    produto: string;
    tipoLicenca?: string; // E3, Standard, etc.
    chaveSerial: string;
    dataExpiracao: string;
    usuario: string; // User's real name
    cargo?: string;
    setor?: string;
    gestor?: string;
    centroCusto?: string;
    contaRazao?: string;
    nomeComputador?: string;
    numeroChamado?: string;
}

export type Page = 'Dashboard' | 'Inventário de Equipamentos' | 'Inventário Absolute' | 'Controle de Licenças' | 'Usuários e Permissões' | 'Configurações' | 'Auditoria';

export interface DbStatus {
    status: string;
    version: string;
    databaseName: string;
    tableCount: number;
}

export interface AuditLogEntry {
  id: number;
  username: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  target_type: 'EQUIPMENT' | 'LICENSE' | 'USER';
  target_id: number | null;
  details: string;
  timestamp: string;
}

export interface HeaderStyle {
  fontFamily: string;
  fontSize: string;
  textAlign: 'left' | 'center' | 'right';
}