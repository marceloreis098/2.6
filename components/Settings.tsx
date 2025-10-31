import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, DbStatus, Equipment, HeaderStyle, License } from '../types';
import Icon from './common/Icon';
import { icons } from 'lucide-react';
import { 
    generate2FASecret, enable2FA, disable2FA, backupDatabase, resetDatabase, getDatabaseStatus, 
    importEquipment, getLicenses, importLicenses, restoreDatabase,
    testAbsoluteConnection
} from '../services/apiService';
import LogService from '../services/logService';

interface SettingsProps {
    currentUser: User;
    onSave: (settings: { 
        sso: boolean; ssoUrl: string; ssoEntityId: string; ssoCertificate: string; 
        apiKey: string; twoFactor: boolean; companyName: string; headerStyle: HeaderStyle;
        absoluteTokenId: string; absoluteSecretKey: string; absoluteSyncInterval: number;
    }) => Promise<void>;
    currentSettings: { 
        sso: boolean; ssoUrl: string; ssoEntityId: string; ssoCertificate: string; 
        apiKey: string; twoFactor: boolean; companyName: string; headerStyle: HeaderStyle;
        absoluteTokenId: string; absoluteSecretKey: string; absoluteSyncInterval: number;
    };
}

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState(LogService.get());

    const refreshLogs = () => {
        setLogs(LogService.get());
    };

    const handleClearLogs = () => {
        if (window.confirm("Tem certeza que deseja limpar os logs desta sessão?")) {
            LogService.clear();
            refreshLogs();
        }
    };

    const handleExportLogs = () => {
        const logContent = logs
            .map(log => 
                `[${log.timestamp}] [${log.type}]\nMessage: ${log.message}\nStack: ${log.stack || 'N/A'}`
            )
            .join('\n\n----------------------------------\n\n');

        if (!logContent) {
            alert("Não há logs para exportar.");
            return;
        }

        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventario-logs-${new Date().toISOString().split('T')[0]}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-2 border-b dark:border-dark-border pb-2">Logs do Sistema (Frontend)</h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                Exibe os últimos erros de aplicação e API capturados nesta sessão. Útil para diagnosticar problemas.
            </p>
            <div className="flex flex-wrap gap-4 mb-4">
                <button onClick={refreshLogs} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    <Icon name="RefreshCw" size={16} /> Atualizar
                </button>
                <button onClick={handleExportLogs} disabled={logs.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                    <Icon name="Download" size={16} /> Exportar Logs (.txt)
                </button>
                 <button onClick={handleClearLogs} disabled={logs.length === 0} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors">
                    <Icon name="Trash2" size={16} /> Limpar Logs
                </button>
            </div>
            <div className="w-full bg-gray-900 text-white font-mono text-xs rounded-lg p-4 h-96 overflow-auto">
                {logs.length > 0 ? logs.map((log, index) => (
                    <div key={index} className="border-b border-gray-700 mb-2 pb-2 last:border-b-0">
                        <p className={log.type === 'API_ERROR' ? 'text-red-400' : log.type === 'APP_ERROR' ? 'text-yellow-400' : 'text-cyan-400'}>
                            <span className="font-bold">[{log.type}]</span> {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="whitespace-pre-wrap"><strong>Message:</strong> {log.message}</p>
                        {log.stack && <pre className="whitespace-pre-wrap text-gray-400 mt-1"><strong>Stack:</strong> {log.stack}</pre>}
                    </div>
                )) : <p>Nenhum log registrado nesta sessão.</p>}
            </div>
        </div>
    );
};

type SettingsTab = 'geral' | 'integracoes' | 'database' | 'seguranca' | 'logs';

const Settings: React.FC<SettingsProps> = ({ currentUser, onSave, currentSettings }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('geral');
    const metadataFileInputRef = useRef<HTMLInputElement>(null);


    // 2FA State
    const [is2FAEnabled, setIs2FAEnabled] = useState(currentUser.is2FAEnabled);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [token, setToken] = useState('');
    const [error2FA, setError2FA] = useState('');
    const [loading2FA, setLoading2FA] = useState(false);

    // General Settings State
    const [companyName, setCompanyName] = useState(currentSettings.companyName);
    const [ssoEnabled, setSsoEnabled] = useState(currentSettings.sso);
    // SAML SSO State
    const [ssoUrl, setSsoUrl] = useState(currentSettings.ssoUrl);
    const [ssoEntityId, setSsoEntityId] = useState(currentSettings.ssoEntityId);
    const [ssoCertificate, setSsoCertificate] = useState(currentSettings.ssoCertificate);

    const [apiKey, setApiKey] = useState(currentSettings.apiKey);
    const [twoFactorRequired, setTwoFactorRequired] = useState(currentSettings.twoFactor);
    const [isSaving, setIsSaving] = useState(false);
    
    // Header Style State
    const [headerFontFamily, setHeaderFontFamily] = useState(currentSettings.headerStyle.fontFamily);
    const [headerFontSize, setHeaderFontSize] = useState(currentSettings.headerStyle.fontSize);
    const [headerTextAlign, setHeaderTextAlign] = useState(currentSettings.headerStyle.textAlign);

    // Absolute Integration State
    const [absoluteTokenId, setAbsoluteTokenId] = useState(currentSettings.absoluteTokenId);
    const [absoluteSecretKey, setAbsoluteSecretKey] = useState(currentSettings.absoluteSecretKey);
    const [absoluteSyncInterval, setAbsoluteSyncInterval] = useState(currentSettings.absoluteSyncInterval);
    const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });


    // DB Management State
    const [dbAction, setDbAction] = useState<{ type: 'backup' | 'reset' | null, loading: boolean }>({ type: null, loading: false });
    const [dbMessage, setDbMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isBackupMade, setIsBackupMade] = useState(false);
    const equipmentFileInputRef = useRef<HTMLInputElement>(null);
    const restoreFileInputRef = useRef<HTMLInputElement>(null);
    const [isImportingEquipment, setIsImportingEquipment] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);


    // DB Status State
    const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
    const [dbStatusLoading, setDbStatusLoading] = useState(true);
    const [dbStatusError, setDbStatusError] = useState('');
    
    // License Management State
    const [allLicenses, setAllLicenses] = useState<License[]>([]);
    const [loadingLicenses, setLoadingLicenses] = useState(true);
    const [managedProducts, setManagedProducts] = useState<string[]>([]);
    const licenseFileInputRef = useRef<HTMLInputElement>(null);
    const [productToImport, setProductToImport] = useState<string | null>(null);
    const [isImportingLicense, setIsImportingLicense] = useState(false);


    useEffect(() => {
        if (currentUser.role === UserRole.Admin) {
            const fetchStatus = async () => {
                setDbStatusLoading(true);
                setDbStatusError('');
                try {
                    const statusData = await getDatabaseStatus();
                    setDbStatus(statusData);
                } catch (err: any) {
                    if (err.message === 'Failed to fetch') {
                        setDbStatusError('Falha ao conectar com a API. Verifique se o servidor backend (na porta 3001) está em execução e se o firewall permite a conexão.');
                    } else {
                        // Handle structured error from the backend
                        let detailedMessage = `Erro no servidor: ${err.message || 'Erro desconhecido.'}`;
                        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                            detailedMessage = "Acesso negado ao banco de dados. Verifique se o usuário e a senha no arquivo .env da API estão corretos.";
                        } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
                            detailedMessage = "Não foi possível conectar ao host do banco de dados. Verifique a configuração DB_HOST no arquivo .env da API e se o MariaDB está em execução.";
                        } else if (err.code === 'ER_BAD_DB_ERROR') {
                            detailedMessage = "O banco de dados especificado não foi encontrado. Verifique se o nome está correto no .env da API e se ele foi criado no MariaDB.";
                        }
                        setDbStatusError(detailedMessage);
                    }
                } finally {
                    setDbStatusLoading(false);
                }
            };
            const fetchLicensesAndProducts = async () => {
                setLoadingLicenses(true);
                try {
                    const licensesData = await getLicenses();
                    setAllLicenses(licensesData);

                    // Unify product list from DB and localStorage for consistency
                    const savedTotalsJSON = localStorage.getItem('licenseTotals');
                    const savedTotals = savedTotalsJSON ? JSON.parse(savedTotalsJSON) : {};

                    const savedProductNamesJSON = localStorage.getItem('productNames');
                    const savedProductNames = savedProductNamesJSON ? JSON.parse(savedProductNamesJSON) : [];
                    
                    const currentProductNames = new Set<string>();
                    
                    // 1. Add from active licenses in DB
                    licensesData.forEach(l => currentProductNames.add(l.produto));
                    
                    // 2. Add from saved totals in localStorage
                    Object.keys(savedTotals).forEach(p => currentProductNames.add(p));
                    
                    // 3. Add from managed product names in localStorage
                    savedProductNames.forEach((p: string) => currentProductNames.add(p));

                    const sortedProductNames = [...currentProductNames].sort();
                    setManagedProducts(sortedProductNames);

                } catch (err) {
                    console.error("Failed to fetch licenses for settings page", err);
                } finally {
                    setLoadingLicenses(false);
                }
            };

            fetchStatus();
            fetchLicensesAndProducts();
        }
    }, [currentUser.role]);


    const handleGenerateSecret = async () => {
        setLoading2FA(true);
        setError2FA('');
        try {
            const data = await generate2FASecret(currentUser.id);
            setSecret(data.secret);
            setQrCodeUrl(data.qrCodeUrl);
        } catch (error: any) {
            setError2FA(error.message || 'Falha ao gerar o segredo 2FA.');
        } finally {
            setLoading2FA(false);
        }
    };

    const handleEnable2FA = async () => {
        if (!secret || token.length !== 6) {
            setError2FA("Por favor, insira um código válido de 6 dígitos.");
            return;
        }
        setLoading2FA(true);
        setError2FA('');
        try {
            await enable2FA(currentUser.id, secret, token);
            setIs2FAEnabled(true);
            setQrCodeUrl(null);
            setSecret(null);
            setToken('');
            alert('2FA habilitado com sucesso!');
        } catch (error: any) {
             setError2FA(error.message || 'Código de verificação inválido.');
        } finally {
             setLoading2FA(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm("Tem certeza de que deseja desabilitar la autenticação de dois fatores?")) return;
        setLoading2FA(true);
        setError2FA('');
        try {
            await disable2FA(currentUser.id);
            setIs2FAEnabled(false);
            alert('2FA desabilitado com sucesso!');
        } catch (error: any) {
            setError2FA(error.message || 'Falha ao desabilitar 2FA.');
        } finally {
            setLoading2FA(false);
        }
    };

    const handleGeneralSettingsSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ 
                sso: ssoEnabled,
                ssoUrl,
                ssoEntityId,
                ssoCertificate,
                apiKey, 
                twoFactor: twoFactorRequired, 
                companyName,
                headerStyle: {
                    fontFamily: headerFontFamily,
                    // FIX: Explicitly cast `headerFontSize` to a string to satisfy the type requirement.
                    // This prevents potential type inference issues where it might be seen as `string | number`.
                    fontSize: String(headerFontSize),
                    textAlign: headerTextAlign,
                },
                absoluteTokenId,
                absoluteSecretKey,
                absoluteSyncInterval,
            });
        } catch (error) {
            // Error is already handled with an alert in the `onSave` function in App.tsx
            console.error("Failed to save settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDbAction = async (action: 'backup' | 'reset') => {
        let confirmation = true;
        
        if (action === 'reset') {
            confirmation = window.confirm("ATENÇÃO: PERDA DE DADOS! Esta ação apagará TODOS os dados do sistema (equipamentos, licenças, histórico e todos os usuários, exceto o 'admin'). Apenas a conta de administrador padrão será recriada. Esta ação é irreversível. Deseja continuar?");
        }
        if (!confirmation) return;

        setDbAction({ type: action, loading: true });
        setDbMessage(null);

        try {
            if (action === 'backup') {
                const blob = await backupDatabase();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
                a.download = `inventario-backup-${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                setIsBackupMade(true);
                setDbMessage({ type: 'success', text: "Download do backup iniciado." });
            } else { // reset
                const response = await resetDatabase();
                alert(response.message + " A página será recarregada para aplicar as alterações.");
                window.location.reload();
                return; // Prevent further state updates on this component instance
            }
        } catch (error: any) {
            setDbMessage({ type: 'error', text: error.message || 'Ocorreu um erro desconhecido.' });
        } finally {
            setDbAction({ type: null, loading: false });
            // Auto-hide message after 5 seconds
            setTimeout(() => setDbMessage(null), 5000);
        }
    };

    const parseCSV = (csvText: string, isEquipment: boolean): any[] => {
        const lines = csvText.trim().split(/\r\n|\n/);
        if (lines.length < 1) return [];

        const headerLine = lines[0];
        if (!headerLine) throw new Error("Arquivo CSV está vazio ou o cabeçalho não foi encontrado.");

        const header = headerLine.split(';').map(h => h.trim().replace(/"/g, '').toUpperCase());
        const data = [];

        const mappings = isEquipment ? {
            'EQUIPAMENTO': 'equipamento', 'GARANTIA': 'garantia', 'PATRIMONIO': 'patrimonio', 'SERIAL': 'serial',
            'USUÁRIO ATUAL': 'usuarioAtual', 'USUÁRIO ANTERIOR': 'usuarioAnterior', 'LOCAL': 'local', 'SETOR': 'setor',
            'DATA ENTREGA AO USUÁRIO': 'dataEntregaUsuario', 'STATUS': 'status', 'DATA DE DEVOLUÇÃO': 'dataDevolucao',
            'TIPO': 'tipo', 'NOTA DE COMPRA': 'notaCompra', 'NOTA / PL K&M': 'notaPlKm',
            'TERMO DE RESPONSABILIDADE': 'termoResponsabilidade', 'FOTO': 'foto', 'QR CODE': 'qrCode'
        } : {
            'PRODUTO': 'produto', 'TIPOLICENCA': 'tipoLicenca', 'CHAVESERIAL': 'chaveSerial', 'DATAEXPIRACAO': 'dataExpiracao',
            'USUARIO': 'usuario', 'CARGO': 'cargo', 'SETOR': 'setor', 'GESTOR': 'gestor',
            'CENTROCUSTO': 'centroCusto', 'CONTARAZAO': 'contaRazao', 'NOMECOMPUTADOR': 'nomeComputador', 'NUMEROCHAMADO': 'numeroChamado'
        };

        const modelKeys = Object.values(mappings);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = line.split(';').map(v => v.trim());
            const entry: { [key: string]: any } = {};

            header.forEach((rawHeaderKey, index) => {
                const headerKey = rawHeaderKey.toUpperCase().replace(/\s+/g, '');
                const mappedKey = mappings[headerKey as keyof typeof mappings];
                if (mappedKey && index < values.length) {
                    entry[mappedKey] = values[index] || '';
                }
            });

            modelKeys.forEach(key => {
                if (entry[key] === undefined) {
                    entry[key] = '';
                }
            });

            if (isEquipment) {
                 const identifier = entry.patrimonio || entry.serial || `imported_${Date.now()}_${data.length}`;
                 entry.qrCode = identifier;
                 entry.foto = entry.foto || `https://picsum.photos/seed/${identifier}/200/150`;
                 if (entry.equipamento) data.push(entry);
            } else {
                if (entry.chaveSerial) data.push(entry);
            }
        }
        return data;
    };


    const handleEquipmentFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImportingEquipment(true);
        setDbMessage(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (equipmentFileInputRef.current) equipmentFileInputRef.current.value = "";

            try {
                const parsedData = parseCSV(text, true) as Omit<Equipment, 'id'>[];
                if (parsedData.length === 0) {
                    setDbMessage({ type: 'error', text: "O arquivo CSV de equipamentos está vazio ou em um formato inválido." });
                    setIsImportingEquipment(false);
                    return;
                }
                
                if (window.confirm(`Isso substituirá todo o inventário de equipamentos atual por ${parsedData.length} novos itens. Deseja continuar?`)) {
                    try {
                        const result = await importEquipment(parsedData);
                        alert(result.message + " A página será recarregada.");
                        window.location.reload();
                    } catch (error: any) {
                        setDbMessage({ type: 'error', text: String(error?.message || "Ocorreu um erro ao importar o arquivo CSV.") });
                        setIsImportingEquipment(false);
                    }
                } else {
                    setIsImportingEquipment(false);
                }
            } catch (error: any) {
                setDbMessage({ type: 'error', text: `Ocorreu um erro ao processar o arquivo CSV: ${String(error?.message)}` });
                setIsImportingEquipment(false);
            }
        };
        reader.onerror = () => {
             setDbMessage({ type: 'error', text: 'Falha ao ler o arquivo.' });
             setIsImportingEquipment(false);
             if (equipmentFileInputRef.current) equipmentFileInputRef.current.value = "";
        }
        reader.readAsText(file, 'UTF-8');
    };

    const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsRestoring(true);
        setDbMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (restoreFileInputRef.current) restoreFileInputRef.current.value = "";
            try {
                const backupData = JSON.parse(e.target?.result as string);
                
                 if (window.confirm("ATENÇÃO: PERDA DE DADOS! Esta ação substituirá TODOS os dados atuais do banco de dados pelos dados do arquivo de backup. Esta ação é irreversível. Deseja continuar?")) {
                    try {
                        const result = await restoreDatabase(backupData);
                        alert(result.message + " A página será recarregada.");
                        window.location.reload();
                    } catch (error: any) {
                        setDbMessage({ type: 'error', text: `Falha ao restaurar o backup: ${error.message}` });
                        setIsRestoring(false);
                    }
                } else {
                    setIsRestoring(false);
                }

            } catch (error: any) {
                setDbMessage({ type: 'error', text: `Arquivo de backup inválido: ${error.message}` });
                setIsRestoring(false);
            }
        };
        reader.onerror = () => {
            setDbMessage({ type: 'error', text: 'Falha ao ler o arquivo de backup.' });
            setIsRestoring(false);
            if (restoreFileInputRef.current) restoreFileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const handleLicenseFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !productToImport) return;

        setIsImportingLicense(true);
        setDbMessage(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (licenseFileInputRef.current) licenseFileInputRef.current.value = "";

            try {
                const parsedData = parseCSV(text, false) as Omit<License, 'id'>[];
                 if (parsedData.length === 0) {
                    setDbMessage({ type: 'error', text: `O arquivo CSV de licenças para "${productToImport}" está vazio ou em formato inválido.` });
                    setIsImportingLicense(false);
                    return;
                }
                
                if (window.confirm(`Isso substituirá todas as licenças para o produto "${productToImport}" por ${parsedData.length} novos registros. Deseja continuar?`)) {
                    try {
                        const result = await importLicenses(productToImport, parsedData, currentUser.username);
                        alert(result.message + " A página será recarregada.");
                        window.location.reload();
                    } catch (error: any) {
                        setDbMessage({ type: 'error', text: `Falha na importação: ${error.message}` });
                        setIsImportingLicense(false);
                    }
                } else {
                     setIsImportingLicense(false);
                }
            } catch (error: any) {
                 setDbMessage({ type: 'error', text: `Erro ao processar arquivo: ${error.message}` });
                 setIsImportingLicense(false);
            }
        };
        reader.onerror = () => {
             setDbMessage({ type: 'error', text: 'Falha ao ler o arquivo.' });
             setIsImportingLicense(false);
             if (licenseFileInputRef.current) licenseFileInputRef.current.value = "";
        }
        reader.readAsText(file, 'UTF-8');
    };

    const handleSsoMetadataUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlString = e.target?.result as string;
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "text/xml");

                const ssoService = xmlDoc.querySelector('SingleSignOnService[Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"]');
                const ssoLocation = ssoService?.getAttribute('Location');

                const entityID = xmlDoc.querySelector('EntityDescriptor')?.getAttribute('entityID');

                const certificate = xmlDoc.querySelector('X509Certificate')?.textContent?.trim().replace(/\s+/g, '');

                if (ssoLocation) setSsoUrl(ssoLocation);
                if (entityID) setSsoEntityId(entityID);
                if (certificate) setSsoCertificate(certificate);

                alert('Dados SSO preenchidos a partir do arquivo de metadados.');
            } catch (error) {
                console.error("Failed to parse SAML metadata", error);
                alert("Erro ao processar o arquivo XML. Verifique se o formato está correto.");
            } finally {
                 if (metadataFileInputRef.current) metadataFileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };
    
    const handleDownloadCertificate = () => {
        if (!ssoCertificate) return;
        const blob = new Blob([ssoCertificate], { type: 'application/x-x509-ca-cert' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saml_certificate.cer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleAbsoluteTest = async () => {
        setTestStatus({ type: 'loading', message: '' });
        try {
            const result = await testAbsoluteConnection({ tokenId: absoluteTokenId, secretKey: absoluteSecretKey });
            if (result.success) {
                setTestStatus({ type: 'success', message: result.message });
            } else {
                setTestStatus({ type: 'error', message: result.message });
            }
        } catch (error: any) {
            setTestStatus({ type: 'error', message: error.message || "Erro desconhecido." });
        }
    };

    const fontOptions = ['Arial', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'inherit'];

    const renderGeneralTab = () => (
        <div className="space-y-6">
             <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-4">Configurações Gerais</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Nome da Empresa</label>
                        <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-4">Personalização do Cabeçalho</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="headerFontFamily" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Fonte</label>
                        <select
                            id="headerFontFamily"
                            value={headerFontFamily}
                            onChange={(e) => setHeaderFontFamily(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                        >
                            {fontOptions.map(font => <option key={font} value={font}>{font === 'inherit' ? 'Padrão do Sistema' : font}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="headerFontSize" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Tamanho da Fonte (rem)</label>
                        <input
                            type="number"
                            id="headerFontSize"
                            step="0.1"
                            min="1"
                            max="3"
                            // FIX: Ensure the value passed to the input is always a string or number.
                            // parseFloat can return NaN, which is not a valid input value. Fallback to a default string.
                            // Also, simplify the expression to avoid unnecessary string conversion.
                            value={parseFloat(String(headerFontSize)) || ''}
                            onChange={(e) => setHeaderFontSize(`${e.target.value}rem`)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="headerTextAlign" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Alinhamento do Texto</label>
                        <select
                            id="headerTextAlign"
                            value={headerTextAlign}
                            onChange={(e) => setHeaderTextAlign(e.target.value as 'left' | 'center' | 'right')}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                        >
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                            <option value="right">Direita</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderIntegrationsTab = () => (
        <div className="space-y-8">
            {/* SAML SSO Config */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md border dark:border-dark-border">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary">Configuração SAML SSO</h3>

                <div className="flex items-center justify-between mt-6">
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-dark-text-primary">Habilitar Login com SAML SSO</h4>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Permite que os usuários façam login usando um Provedor de Identidade SAML (ex: Google Workspace, Azure AD).</p>
                    </div>
                    <label htmlFor="sso-enabled-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="sso-enabled-toggle" className="sr-only" checked={ssoEnabled} onChange={() => setSsoEnabled(!ssoEnabled)} />
                            <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${ssoEnabled ? 'translate-x-full bg-brand-primary' : ''}`}></div>
                        </div>
                    </label>
                </div>

                {ssoEnabled && (
                    <div className="mt-6 border-t dark:border-dark-border pt-6 space-y-6 animate-fade-in">
                        {/* Option 1 */}
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-dark-text-primary">Opção 1: Upload de Metadados</h4>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Faça o upload do arquivo XML de metadados do seu provedor de identidade para preencher os campos automaticamente.</p>
                            <input type="file" ref={metadataFileInputRef} onChange={handleSsoMetadataUpload} accept=".xml" className="hidden" />
                            <button onClick={() => metadataFileInputRef.current?.click()} className="bg-brand-secondary text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 mt-4 text-sm font-semibold">
                                <Icon name="Upload" size={16} /> Carregar Arquivo XML
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t dark:border-dark-border"></div>
                            </div>
                            <span className="relative bg-white dark:bg-dark-card px-4 text-sm text-gray-500 dark:text-dark-text-secondary">OU</span>
                        </div>

                        {/* Option 2 */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800 dark:text-dark-text-primary">Opção 2: Configuração Manual</h4>
                            
                            <div>
                                <label htmlFor="ssoUrl" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">URL do SSO</label>
                                <div className="relative mt-1">
                                    <input type="text" id="ssoUrl" value={ssoUrl} onChange={(e) => setSsoUrl(e.target.value)} className="w-full p-2 pr-10 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800"/>
                                    <button type="button" onClick={() => navigator.clipboard.writeText(ssoUrl)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-brand-primary" title="Copiar URL do SSO">
                                        <Icon name="Copy" size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="ssoEntityId" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">ID da Entidade</label>
                                <div className="relative mt-1">
                                    <input type="text" id="ssoEntityId" value={ssoEntityId} onChange={(e) => setSsoEntityId(e.target.value)} className="w-full p-2 pr-10 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800"/>
                                    <button type="button" onClick={() => navigator.clipboard.writeText(ssoEntityId)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-brand-primary" title="Copiar ID da Entidade">
                                        <Icon name="Copy" size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="ssoCertificate" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Certificado X.509</label>
                                <div className="relative mt-1">
                                    <textarea id="ssoCertificate" value={ssoCertificate} onChange={(e) => setSsoCertificate(e.target.value)} rows={8} className="w-full p-2 pr-10 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 font-mono text-xs"/>
                                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                                        <button type="button" onClick={() => navigator.clipboard.writeText(ssoCertificate)} className="p-1.5 text-gray-500 hover:text-brand-primary bg-white dark:bg-gray-800 rounded-md border dark:border-dark-border" title="Copiar Certificado">
                                            <Icon name="Copy" size={16} />
                                        </button>
                                         <button type="button" onClick={handleDownloadCertificate} className="p-1.5 text-gray-500 hover:text-brand-primary bg-white dark:bg-gray-800 rounded-md border dark:border-dark-border" title="Baixar Certificado">
                                            <Icon name="Download" size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Absolute Resilience Config */}
             <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md border dark:border-dark-border">
                 <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary">Integração com Absolute Resilience</h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Conecte-se à API do Absolute para sincronizar automaticamente seu inventário de dispositivos.</p>
                <div className="mt-4 pt-4 border-t dark:border-dark-border grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="absoluteTokenId" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">ID do Token da API</label>
                        <input type="password" id="absoluteTokenId" value={absoluteTokenId} onChange={(e) => setAbsoluteTokenId(e.target.value)} className="w-full mt-1 p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800"/>
                    </div>
                     <div>
                        <label htmlFor="absoluteSecretKey" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Chave Secreta da API</label>
                        <input type="password" id="absoluteSecretKey" value={absoluteSecretKey} onChange={(e) => setAbsoluteSecretKey(e.target.value)} className="w-full mt-1 p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800"/>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="absoluteSyncInterval" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Intervalo de Sincronização Automática (horas)</label>
                         <select id="absoluteSyncInterval" value={absoluteSyncInterval} onChange={e => setAbsoluteSyncInterval(Number(e.target.value))} className="w-full mt-1 p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800">
                            <option value="0">Desativado</option>
                            <option value="1">A cada 1 hora</option>
                            <option value="6">A cada 6 horas</option>
                            <option value="12">A cada 12 horas</option>
                            <option value="24">A cada 24 horas</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                     <button onClick={handleAbsoluteTest} disabled={testStatus.type === 'loading'} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400">
                        <Icon name="Plug" size={16} />
                        {testStatus.type === 'loading' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                    {testStatus.type !== 'idle' && (
                        <div className={`flex items-center gap-2 text-sm ${testStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {/* FIX: Replaced icon names with valid alternatives ('CheckCircle' -> 'CircleCheck', 'XCircle' -> 'CircleX') to resolve type error. */}
                            <Icon name={testStatus.type === 'success' ? 'CircleCheck' : 'CircleX'} size={18} />
                            <span>{testStatus.message}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-4">API do Gemini</h3>
                 <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">Insira sua chave de API do Google Gemini para habilitar o assistente de IA para relatórios.</p>
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Chave de API do Gemini</label>
                    <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                    />
                </div>
            </div>
        </div>
    );
    

    const renderSecurityTab = () => (
         <div className="space-y-6">
             <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-2">Autenticação de Dois Fatores (2FA) Pessoal</h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                    Adicione uma camada extra de segurança à sua conta. Use um aplicativo como Google Authenticator ou Authy.
                </p>
                {error2FA && <p className="text-red-500 mb-4">{error2FA}</p>}
                
                {is2FAEnabled ? (
                    <div>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold mb-4">
                            <Icon name="ShieldCheck" size={20} />
                            <span>Autenticação de dois fatores está ATIVADA.</span>
                        </div>
                        <button onClick={handleDisable2FA} disabled={loading2FA} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                             {loading2FA ? 'Desativando...' : 'Desativar 2FA'}
                        </button>
                    </div>
                ) : qrCodeUrl ? (
                     <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="text-center">
                            <p className="font-semibold mb-2">1. Escaneie o QR Code</p>
                            <div className="p-2 border dark:border-dark-border rounded-lg bg-white inline-block">
                               <img src={qrCodeUrl} alt="QR Code" />
                            </div>
                        </div>
                        <div className="flex-1">
                             <p className="font-semibold mb-2">2. Insira o código de 6 dígitos</p>
                             <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">Após escanear, insira o código gerado pelo seu aplicativo para confirmar.</p>
                             <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="p-2 border dark:border-dark-border rounded-md w-32 text-center text-lg tracking-widest"
                                />
                                <button onClick={handleEnable2FA} disabled={loading2FA} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                    {loading2FA ? 'Verificando...' : 'Ativar e Verificar'}
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleGenerateSecret} disabled={loading2FA} className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                         {loading2FA ? 'Gerando...' : 'Iniciar Configuração do 2FA'}
                    </button>
                )}
            </div>
            
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-2">Política de Segurança Global</h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                    Estas configurações se aplicam a todos os usuários que não fazem login via SSO.
                </p>
                 <div className="flex items-center justify-between">
                    <label htmlFor="twoFactorRequired" className="font-medium text-gray-700 dark:text-dark-text-secondary">
                        Exigir 2FA para todos os usuários
                    </label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                            type="checkbox"
                            name="twoFactorRequired"
                            id="twoFactorRequired"
                            checked={twoFactorRequired}
                            onChange={() => setTwoFactorRequired(!twoFactorRequired)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label htmlFor="twoFactorRequired" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderDatabaseTab = () => (
        <div className="space-y-6">
             <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-2">Status do Banco de Dados</h3>
                {dbStatusLoading ? (
                     <p>Verificando status...</p>
                ) : dbStatusError ? (
                     <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 border-l-4 border-red-500">
                        <p className="font-bold">Falha na Conexão</p>
                        <p className="text-sm mt-1">{dbStatusError}</p>
                    </div>
                ) : dbStatus ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div><p className="text-sm text-gray-500 dark:text-dark-text-secondary">Status</p><p className={`font-bold ${dbStatus.status === 'Online' ? 'text-green-500' : 'text-red-500'}`}>{dbStatus.status}</p></div>
                        <div><p className="text-sm text-gray-500 dark:text-dark-text-secondary">Versão</p><p className="font-bold">{dbStatus.version}</p></div>
                        <div><p className="text-sm text-gray-500 dark:text-dark-text-secondary">Database</p><p className="font-bold">{dbStatus.databaseName}</p></div>
                        <div><p className="text-sm text-gray-500 dark:text-dark-text-secondary">Tabelas</p><p className="font-bold">{dbStatus.tableCount}</p></div>
                    </div>
                ) : null }
            </div>
            
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-secondary dark:text-dark-text-primary mb-2">Gerenciamento de Dados</h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">Realize backups ou importe dados de inventário e licenças via arquivos CSV.</p>
                
                 {dbMessage && (
                    <div className={`p-3 mb-4 rounded-md text-sm ${dbMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {dbMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Equipment Import */}
                    <div className="p-4 border dark:border-dark-border rounded-lg">
                         <h4 className="font-semibold mb-2">Inventário de Equipamentos</h4>
                         <input type="file" ref={equipmentFileInputRef} onChange={handleEquipmentFileImport} accept=".csv" className="hidden" />
                         <button onClick={() => equipmentFileInputRef.current?.click()} disabled={isImportingEquipment} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                            <Icon name="FileUp" size={16} /> {isImportingEquipment ? 'Importando...' : 'Importar Equipamentos (CSV)'}
                         </button>
                         <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">Isto substituirá todos os dados de equipamentos existentes.</p>
                    </div>

                    {/* License Import */}
                    <div className="p-4 border dark:border-dark-border rounded-lg">
                         <h4 className="font-semibold mb-2">Controle de Licenças</h4>
                         {loadingLicenses ? <p className="text-xs">Carregando produtos...</p> : (
                             <>
                                <select onChange={(e) => setProductToImport(e.target.value)} defaultValue="" className="w-full p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 mb-2">
                                    <option value="" disabled>Selecione um produto para importar</option>
                                    {managedProducts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <input type="file" ref={licenseFileInputRef} onChange={handleLicenseFileImport} accept=".csv" className="hidden" />
                                <button onClick={() => licenseFileInputRef.current?.click()} disabled={!productToImport || isImportingLicense} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                                    <Icon name="FileUp" size={16} /> {isImportingLicense ? 'Importando...' : 'Importar Licenças (CSV)'}
                                </button>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">Isto substituirá todas as licenças do produto selecionado.</p>
                             </>
                         )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md border-2 border-red-500/50">
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Zona de Perigo</h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">Ações nesta área são irreversíveis e podem causar perda de dados. Prossiga com cautela.</p>
                <div className="flex flex-wrap gap-4">
                     <button onClick={() => handleDbAction('backup')} disabled={dbAction.loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400">
                         <Icon name="Download" size={16} /> {dbAction.type === 'backup' && dbAction.loading ? 'Gerando...' : 'Backup Completo (.json)'}
                     </button>
                      <input type="file" ref={restoreFileInputRef} onChange={handleRestoreFile} accept=".json" className="hidden" />
                     <button onClick={() => restoreFileInputRef.current?.click()} disabled={isRestoring} className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-400">
                         <Icon name="Upload" size={16} /> {isRestoring ? 'Restaurando...' : 'Restaurar Backup (.json)'}
                     </button>
                    <button onClick={() => handleDbAction('reset')} disabled={!isBackupMade || dbAction.loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:opacity-50" title={!isBackupMade ? "Faça um backup antes de resetar o banco de dados." : ""}>
                        <Icon name="DatabaseZap" size={16} /> {dbAction.type === 'reset' && dbAction.loading ? 'Resetando...' : 'Resetar Banco de Dados'}
                    </button>
                </div>
                {!isBackupMade && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">A opção de resetar será habilitada após você realizar um backup nesta sessão.</p>}
            </div>
        </div>
    );

    const tabs: { id: SettingsTab; label: string; icon: keyof typeof icons }[] = [
        { id: 'geral', label: 'Geral', icon: 'SlidersHorizontal' },
        { id: 'integracoes', label: 'Integrações', icon: 'Plug' },
        { id: 'seguranca', label: 'Segurança', icon: 'Shield' },
        { id: 'database', label: 'Banco de Dados', icon: 'Database' },
        { id: 'logs', label: 'Logs', icon: 'FileText' },
    ];


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">Configurações</h2>
            
             <div className="border-b border-gray-200 dark:border-dark-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                activeTab === tab.id
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:border-dark-border'
                            }`}
                        >
                            <Icon name={tab.icon} size={16} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'geral' && renderGeneralTab()}
                {activeTab === 'integracoes' && renderIntegrationsTab()}
                {activeTab === 'seguranca' && renderSecurityTab()}
                {activeTab === 'database' && renderDatabaseTab()}
                {activeTab === 'logs' && <LogViewer />}
            </div>

             <div className="mt-8 flex justify-end">
                <button onClick={handleGeneralSettingsSave} disabled={isSaving} className="bg-brand-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold">
                    {isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}
                </button>
            </div>
        </div>
    );
};

export default Settings;