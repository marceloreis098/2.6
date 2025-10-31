

const UserRole = {
  Admin: 'Admin',
  UserManager: 'User Manager',
  User: 'User/Operador',
};

const USERS = [
  {
    id: 1,
    realName: 'Marcelo Admin',
    username: 'admin',
    password: 'marceloadmin',
    email: 'admin@company.com',
    role: UserRole.Admin,
    language: 'Português',
    authentication: 'Local',
    modulePermissions: 'Todos',
    groups: 'Admins',
    lastLogin: '2024-07-28 10:00:00',
    is2FAEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP', // Exemplo de segredo para o admin
  },
  {
    id: 2,
    realName: 'Gerente de Usuários',
    username: 'usermanager',
    password: 'password',
    email: 'manager@company.com',
    role: UserRole.UserManager,
    language: 'Português',
    authentication: 'Local',
    modulePermissions: 'Gerenciamento de Usuários',
    groups: 'Managers',
    lastLogin: '2024-07-28 09:30:00',
    is2FAEnabled: true,
    twoFactorSecret: 'KRSVGY3DPEHPK3PXP', // Exemplo de segredo
  },
  {
    id: 3,
    realName: 'João Operador',
    username: 'joperador',
    password: 'password',
    email: 'joao.op@company.com',
    role: UserRole.User,
    language: 'Português',
    authentication: 'Local',
    modulePermissions: 'Visualização',
    groups: 'Operators',
    lastLogin: '2024-07-27 15:45:00',
    is2FAEnabled: true,
    ssoProvider: 'google',
    twoFactorSecret: null, // SSO não precisa de 2FA neste fluxo
  },
   {
    id: 4,
    realName: 'Ana Silva',
    username: 'anasilva',
    password: 'password',
    email: 'ana.silva@company.com',
    role: UserRole.User,
    language: 'Português',
    authentication: 'Local',
    modulePermissions: 'Visualização',
    groups: 'Operators, Financeiro',
    lastLogin: '2024-07-29 11:20:00',
    is2FAEnabled: false, // Começa desabilitado para permitir o fluxo de configuração
    twoFactorSecret: null,
  },
];

const EQUIPMENT = [
  {
    "id": 1,
    "equipamento": "Notebook Dell Latitude 5420",
    "garantia": "2025-12-31",
    "patrimonio": "NTB-00123",
    "serial": "ABC123XYZ",
    "usuarioAtual": "Carlos Souza",
    "usuarioAnterior": "Ana Pereira",
    "local": "Matriz",
    "setor": "Financeiro",
    "dataEntregaUsuario": "2024-01-15",
    "status": "Em Uso",
    "dataDevolucao": "",
    "tipo": "Próprio",
    "notaCompra": "NF-9876",
    "notaPlKm": "PL-54321",
    "termoResponsabilidade": "TR-001.pdf",
    "foto": "https://picsum.photos/seed/NTB-00123/200/150",
    "qrCode": "NTB-00123"
  }
];

const EQUIPMENT_HISTORY = [
    { id: 1, equipmentId: 1, changeType: 'Usuário', from: 'Ana Pereira', to: 'Carlos Souza', changedBy: 'admin', timestamp: '2024-01-15 09:00:00'},
    { id: 2, equipmentId: 2, changeType: 'Localização', from: 'Filial Sul', to: 'Matriz', changedBy: 'joperador', timestamp: '2024-02-20 14:30:00'},
];

const LICENSES = [
    { id: 1, produto: 'Microsoft Office 365', tipoLicenca: 'E3', chaveSerial: 'XXXXX-XXXXX-XXXXX-XXXXX-12345', dataExpiracao: '2025-12-31', usuario: 'Marcelo Admin' },
    { id: 2, produto: 'Adobe Creative Cloud', tipoLicenca: 'All Apps', chaveSerial: 'YYYYY-YYYYY-YYYYY-YYYYY-67890', dataExpiracao: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0], usuario: 'Gerente de Usuários' }, // Expira em 15 dias
    { id: 3, produto: 'CorelDRAW Graphics Suite', tipoLicenca: 'Perpétua', chaveSerial: 'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ABCDE', dataExpiracao: 'N/A', usuario: 'João Operador' },
    { id: 4, produto: 'SketchUp Pro', tipoLicenca: 'Anual', chaveSerial: 'AAAAA-AAAAA-AAAAA-AAAAA-FGHIJ', dataExpiracao: '2025-02-28', usuario: 'Ana Silva' },
    { id: 5, produto: 'Microsoft Office 365', tipoLicenca: 'Standard', chaveSerial: 'BBBBB-BBBBB-BBBBB-BBBBB-KLMNO', dataExpiracao: new Date(new Date().setDate(new Date().getDate() + 50)).toISOString().split('T')[0], usuario: 'Ana Silva' }, // Expira em 50 dias
];


module.exports = {
    USERS,
    EQUIPMENT,
    EQUIPMENT_HISTORY,
    LICENSES,
};