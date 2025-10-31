import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Equipment, User, UserRole, EquipmentHistory } from '../types';
import Icon from './common/Icon';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { getEquipment, getEquipmentHistory, addEquipment, updateEquipment, deleteEquipment, syncWithAbsolute } from '../services/apiService';
import TermoResponsabilidade from './TermoResponsabilidade';

const EquipmentFormModal: React.FC<{
    equipment?: Equipment | null;
    onClose: () => void;
    onSave: () => void;
    currentUser: User;
}> = ({ equipment, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState<Omit<Equipment, 'id' | 'qrCode'>>({
        equipamento: '', garantia: '', patrimonio: '', serial: '', usuarioAtual: '', usuarioAnterior: '',
        local: '', setor: '', dataEntregaUsuario: '', status: '', dataDevolucao: '', tipo: '',
        notaCompra: '', notaPlKm: '', termoResponsabilidade: '', foto: 'https://picsum.photos/seed/new-item/200/150'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (equipment) {
            // Pre-fill form data ensuring all keys are present with empty strings for null/undefined values
            const initialData: Omit<Equipment, 'id' | 'qrCode'> = {
                equipamento: equipment.equipamento || '',
                garantia: equipment.garantia || '',
                patrimonio: equipment.patrimonio || '',
                serial: equipment.serial || '',
                usuarioAtual: equipment.usuarioAtual || '',
                usuarioAnterior: equipment.usuarioAnterior || '',
                local: equipment.local || '',
                setor: equipment.setor || '',
                dataEntregaUsuario: equipment.dataEntregaUsuario || '',
                status: equipment.status || '',
                dataDevolucao: equipment.dataDevolucao || '',
                tipo: equipment.tipo || '',
                notaCompra: equipment.notaCompra || '',
                notaPlKm: equipment.notaPlKm || '',
                termoResponsabilidade: equipment.termoResponsabilidade || '',
                foto: equipment.foto || 'https://picsum.photos/seed/new-item/200/150'
            };
            setFormData(initialData);
        }
    }, [equipment]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError('');
        try {
            const dataToSave = {
                ...formData,
                qrCode: formData.patrimonio || formData.serial // QR code based on patrimonio or serial
            };

            if (equipment) {
                await updateEquipment({ ...dataToSave, id: equipment.id }, currentUser.username);
            } else {
                await addEquipment(dataToSave, currentUser.username);
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error("Failed to save equipment", error);
            setSaveError(error.message || 'Ocorreu um erro desconhecido ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // FIX: Add a robust date parsing function to handle different formats and convert to yyyy-MM-dd
    const formatDateForInput = (dateString: string): string => {
        if (!dateString || typeof dateString !== 'string') return '';
        
        // If already in the correct format, return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // Match formats like dd/MM/yyyy, dd-MM-yyyy, dd.MM.yy
        const parts = dateString.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
        if (parts) {
            const day = parts[1].padStart(2, '0');
            const month = parts[2].padStart(2, '0');
            let year = parts[3];
            
            if (year.length === 2) {
                year = `20${year}`;
            }
            
            return `${year}-${month}-${day}`;
        }
        
        // Return original string if format is not recognized
        return dateString;
    };

    const formFields: (keyof Omit<Equipment, 'id' | 'foto' | 'qrCode'>)[] = [
        'equipamento', 'patrimonio', 'serial', 'usuarioAtual', 'usuarioAnterior', 'local',
        'setor', 'status', 'tipo', 'garantia', 'dataEntregaUsuario', 'dataDevolucao',
        'notaCompra', 'notaPlKm', 'termoResponsabilidade'
    ];

     const fieldLabels: { [key: string]: string } = {
        equipamento: 'Equipamento', patrimonio: 'Patrimônio', serial: 'Serial', usuarioAtual: 'Usuário Atual',
        usuarioAnterior: 'Usuário Anterior', local: 'Local', setor: 'Setor', status: 'Status',
        tipo: 'Tipo', garantia: 'Garantia', dataEntregaUsuario: 'Data Entrega ao Usuário',
        dataDevolucao: 'Data de Devolução', notaCompra: 'Nota de Compra', notaPlKm: 'Nota / PL K&M',
        termoResponsabilidade: 'Termo de Responsabilidade'
    };


    return (
         <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-dark-border flex-shrink-0">
                    <h3 className="text-xl font-bold text-brand-dark dark:text-dark-text-primary">
                        {equipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                    </h3>
                </div>
                {saveError && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/50 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 flex-shrink-0">
                        <strong>Erro ao Salvar:</strong> {saveError}
                    </div>
                )}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
                    {formFields.map(key => {
                         const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                         const value = formData[key as keyof typeof formData] || '';
                         const type = ['dataEntregaUsuario', 'dataDevolucao'].includes(key) ? 'date' : 'text';
                         const isFullWidth = ['equipamento', 'patrimonio', 'serial', 'termoResponsabilidade'].includes(key);
                         
                         return (
                             <div key={key} className={isFullWidth ? 'sm:col-span-2' : ''}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">{label}</label>
                                <input
                                    data-testid={`form-input-${key}`}
                                    type={type}
                                    name={key}
                                    value={type === 'date' ? formatDateForInput(String(value)) : String(value)}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-dark-border rounded-md"
                                    required={['equipamento'].includes(key)}
                                />
                            </div>
                         )
                    })}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-dark-card/50 border-t dark:border-dark-border flex justify-end gap-3 flex-shrink-0">
                     <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
                     <button type="submit" data-testid="save-button" disabled={isSaving} className="bg-brand-primary text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                         {isSaving ? 'Salvando...' : 'Salvar'}
                     </button>
                </div>
            </form>
         </div>
    )
};


const EquipmentDetailsModal: React.FC<{ equipment: Equipment; onClose: () => void, currentUser: User, onEdit: () => void, onDelete: () => void, companyName: string }> = ({ equipment, onClose, currentUser, onEdit, onDelete, companyName }) => {
    const [history, setHistory] = useState<EquipmentHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [showTermo, setShowTermo] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!equipment) return;
            setLoadingHistory(true);
            try {
                const historyData = await getEquipmentHistory(equipment.id);
                setHistory(historyData);
            } catch (error) {
                console.error(`Failed to fetch history for equipment ${equipment.id}`, error);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [equipment]);

    const identifier = equipment.patrimonio || equipment.serial;

    const details = [
        { label: 'Garantia', value: equipment.garantia },
        { label: 'Usuário Atual', value: equipment.usuarioAtual },
        { label: 'Usuário Anterior', value: equipment.usuarioAnterior },
        { label: 'Local', value: equipment.local },
        { label: 'Setor', value: equipment.setor },
        { label: 'Status', value: equipment.status },
        { label: 'Tipo', value: equipment.tipo },
        { label: 'Data Entrega', value: equipment.dataEntregaUsuario },
        { label: 'Data Devolução', value: equipment.dataDevolucao },
        { label: 'Nota Compra', value: equipment.notaCompra },
        { label: 'Nota/PL K&M', value: equipment.notaPlKm },
        { label: 'Termo', value: equipment.termoResponsabilidade },
    ];

    return (
        <>
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
                    <h3 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">{equipment.equipamento} ({identifier})</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><Icon name="X" size={24} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="md:col-span-1 flex flex-col items-center">
                        <img src={equipment.foto || `https://picsum.photos/seed/${identifier}/400/300`} alt={equipment.equipamento} className="w-full h-auto object-cover rounded-lg mb-4 shadow-md" />
                        <div className="p-4 border dark:border-dark-border rounded-lg bg-white">
                             <QRCode value={equipment.qrCode || identifier || 'N/A'} size={128} />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">Patrimônio: {equipment.patrimonio}</p>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Serial: {equipment.serial}</p>
                    </div>
                    <div className="md:col-span-2 text-gray-800 dark:text-dark-text-primary">
                        <h4 className="text-lg font-semibold mb-3 border-b dark:border-dark-border pb-2">Detalhes do Item</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                           {details.map(d => d.value ? (
                                <p key={d.label}><strong>{d.label}:</strong> {d.value}</p>
                           ) : null)}
                        </div>

                         <h4 className="text-lg font-semibold mt-6 mb-3 border-b dark:border-dark-border pb-2">Histórico</h4>
                         <div className="max-h-40 overflow-y-auto">
                            {loadingHistory ? (
                                <p className="text-center text-gray-500 dark:text-dark-text-secondary">Carregando histórico...</p>
                            ) : (
                                <table data-testid="history-table" className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="p-2">Data/Hora</th>
                                            <th className="p-2">Usuário</th>
                                            <th className="p-2">Alteração</th>
                                            <th className="p-2">De</th>
                                            <th className="p-2">Para</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(h => (
                                            <tr key={h.id} className="border-b dark:border-dark-border">
                                                <td className="p-2">{new Date(h.timestamp).toLocaleString()}</td>
                                                <td className="p-2">{h.changedBy}</td>
                                                <td className="p-2">{h.changeType}</td>
                                                <td className="p-2">{h.from_value}</td>
                                                <td className="p-2">{h.to_value}</td>
                                            </tr>
                                        ))}
                                        {history.length === 0 && <tr><td colSpan={5} className="p-2 text-center text-gray-500 dark:text-dark-text-secondary">Nenhum histórico encontrado.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                         </div>
                    </div>
                </div>
                 <div className="p-6 bg-gray-50 dark:bg-dark-card/50 border-t dark:border-dark-border flex justify-end gap-3 flex-shrink-0">
                    {currentUser.role !== UserRole.User && (
                        <>
                            <button data-testid="edit-button" onClick={onEdit} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"><Icon name="Pencil" size={16}/> Editar</button>
                            <button data-testid="delete-button" onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"><Icon name="Trash2" size={16}/> Excluir</button>
                        </>
                    )}
                    <button onClick={() => setShowTermo(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"><Icon name="FileText" size={16}/> Gerar Termo</button>
                    <button data-testid="close-details-button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Fechar</button>
                </div>
            </div>
        </div>
        {showTermo && (
            <TermoResponsabilidade 
                equipment={equipment} 
                user={currentUser} 
                onClose={() => setShowTermo(false)}
                companyName={companyName}
            />
        )}
        </>
    );
};

const EquipmentCard: React.FC<{item: Equipment; onDetailsClick: () => void;}> = ({item, onDetailsClick}) => (
    <div className="bg-gray-50 dark:bg-dark-bg rounded-lg shadow p-4 space-y-3 border dark:border-dark-border">
        <div className="font-bold text-brand-secondary dark:text-dark-text-primary pr-2">{item.equipamento}</div>
        <div className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
            <p><strong>Patrimônio:</strong> <span className="text-brand-primary font-semibold">{item.patrimonio || 'N/A'}</span></p>
            <p><strong>Usuário Atual:</strong> {item.usuarioAtual || 'N/A'}</p>
            <p><strong>Status:</strong> {item.status}</p>
        </div>
        <div className="pt-2">
            <button onClick={onDetailsClick} className="text-brand-primary hover:underline text-sm font-semibold w-full text-right">
                Ver Detalhes
            </button>
        </div>
    </div>
);

const EquipmentList: React.FC<{ currentUser: User; companyName: string; }> = ({ currentUser, companyName }) => {
    const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        local: '',
        setor: '',
        status: '',
    });
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

    const loadEquipment = async () => {
        setLoading(true);
        try {
            const data = await getEquipment();
            setAllEquipment(data);
        } catch (error) {
            console.error("Failed to load equipment", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEquipment();
    }, []);
    
    const handleExport = () => {
        const header = [
            'EQUIPAMENTO','GARANTIA','PATRIMONIO','Serial','USUÁRIO ATUAL','USUÁRIO ANTERIOR','LOCAL','SETOR',
            'DATA ENTREGA AO USUÁRIO','STATUS','DATA DE DEVOLUÇÃO','TIPO','NOTA DE COMPRA','NOTA / PL K&M',
            'TERMO DE RESPONSABILIDADE','FOTO','QR CODE'
        ];
        
        const escapeCsvValue = (value: string | null | undefined): string => {
            const str = String(value || '').trim();
            if (/[";\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = filteredEquipment.map(item => [
            escapeCsvValue(item.equipamento), escapeCsvValue(item.garantia), escapeCsvValue(item.patrimonio), escapeCsvValue(item.serial),
            escapeCsvValue(item.usuarioAtual), escapeCsvValue(item.usuarioAnterior), escapeCsvValue(item.local), escapeCsvValue(item.setor),
            escapeCsvValue(item.dataEntregaUsuario), escapeCsvValue(item.status), escapeCsvValue(item.dataDevolucao), escapeCsvValue(item.tipo),
            escapeCsvValue(item.notaCompra), escapeCsvValue(item.notaPlKm), escapeCsvValue(item.termoResponsabilidade),
            escapeCsvValue(item.foto), escapeCsvValue(item.qrCode)
        ].join(';'));

        const csvContent = [header.join(';'), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventario_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenFormModal = (equipment: Equipment | null = null) => {
        setEditingEquipment(equipment);
        setIsFormModalOpen(true);
        setSelectedEquipment(null);
    };

    const handleCloseFormModal = () => {
        setEditingEquipment(null);
        setIsFormModalOpen(false);
    };

    const handleSave = () => {
        loadEquipment();
    };

    const handleDelete = async () => {
        if (selectedEquipment && window.confirm(`Tem certeza que deseja excluir o item ${selectedEquipment.equipamento}?`)) {
            try {
                await deleteEquipment(selectedEquipment.id, currentUser.username);
                setSelectedEquipment(null);
                loadEquipment();
            } catch (error) {
                console.error("Failed to delete equipment", error);
            }
        }
    };
    
    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncWithAbsolute(currentUser.username);
            alert(result.message);
            await loadEquipment();
        } catch (error: any) {
            alert(`Falha na sincronização: ${error.message}`);
            console.error("Failed to sync with Absolute", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredEquipment = useMemo(() => {
        // FIX: Add null checks to prevent crashes when searching on items with empty fields.
        return allEquipment.filter(item => {
            const searchTermLower = searchTerm.toLowerCase();
            return (
                ((item.equipamento || '').toLowerCase().includes(searchTermLower) ||
                 (item.patrimonio || '').toLowerCase().includes(searchTermLower) ||
                 (item.serial || '').toLowerCase().includes(searchTermLower) ||
                 (item.usuarioAtual || '').toLowerCase().includes(searchTermLower)) &&
                (filters.local ? item.local === filters.local : true) &&
                (filters.setor ? item.setor === filters.setor : true) &&
                (filters.status ? item.status === filters.status : true)
            );
        });
    }, [searchTerm, filters, allEquipment]);

    const uniqueLocais = [...new Set(allEquipment.map(e => e.local).filter(Boolean))];
    const uniqueSetores = [...new Set(allEquipment.map(e => e.setor).filter(Boolean))];
    const uniqueStatus = [...new Set(allEquipment.map(e => e.status).filter(Boolean))];
    
    return (
        <div className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">Inventário de Equipamentos</h2>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleSync} disabled={isSyncing} className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm disabled:bg-gray-400">
                        <Icon name="RefreshCw" size={16} className={isSyncing ? 'animate-spin' : ''}/>
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar com Absolute'}
                    </button>
                    {currentUser.role === UserRole.Admin && (
                        <button onClick={handleExport} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
                            <Icon name="Download" size={16}/> Exportar (CSV)
                        </button>
                    )}
                    <button data-testid="new-equipment-button" onClick={() => handleOpenFormModal()} className="bg-brand-primary text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
                        <Icon name="CirclePlus" size={16}/> Novo Equipamento
                    </button>
                </div>
            </div>

            <div className="space-y-4 mb-4 p-4 border dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg">
                <input
                    data-testid="search-input"
                    type="text"
                    placeholder="Buscar por Equipamento, Patrimônio, Serial, Usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary"
                />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select name="local" value={filters.local} onChange={handleFilterChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary">
                        <option value="">Todos os Locais</option>
                        {uniqueLocais.sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select name="setor" value={filters.setor} onChange={handleFilterChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary">
                        <option value="">Todos os Setores</option>
                        {uniqueSetores.sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border dark:border-dark-border rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary">
                        <option value="">Todos os Status</option>
                        {uniqueStatus.sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

             {loading ? (
                <div className="flex justify-center items-center py-10">
                    <Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} />
                </div>
            ) : (
                <>
                    {/* Mobile/Tablet View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                        {filteredEquipment.map(item => (
                            <EquipmentCard key={item.id} item={item} onDetailsClick={() => setSelectedEquipment(item)} />
                        ))}
                    </div>

                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden lg:block">
                        <table className="w-full text-sm text-left text-gray-700 dark:text-dark-text-secondary">
                            <thead className="text-xs text-gray-800 dark:text-dark-text-primary uppercase bg-gray-100 dark:bg-gray-900/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Equipamento</th>
                                    <th scope="col" className="px-6 py-3">Patrimônio</th>
                                    <th scope="col" className="px-6 py-3">Usuário Atual</th>
                                    <th scope="col" className="px-6 py-3">Local</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEquipment.map(item => (
                                    <tr key={item.id} data-testid={`equipment-row-${item.patrimonio || item.id}`} className="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-dark-text-primary">{item.equipamento}</td>
                                        <td className="px-6 py-4 text-brand-primary font-semibold">{item.patrimonio || 'N/A'}</td>
                                        <td className="px-6 py-4">{item.usuarioAtual || 'N/A'}</td>
                                        <td className="px-6 py-4">{item.local || 'N/A'}</td>
                                        <td className="px-6 py-4">{item.status || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <button data-testid="details-button" onClick={() => setSelectedEquipment(item)} className="text-brand-primary hover:underline">
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredEquipment.length === 0 && (
                        <div className="text-center py-10 text-gray-500 dark:text-dark-text-secondary">Nenhum equipamento encontrado.</div>
                    )}
                </>
            )}

            {selectedEquipment && <EquipmentDetailsModal equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} currentUser={currentUser} onEdit={() => handleOpenFormModal(selectedEquipment)} onDelete={handleDelete} companyName={companyName} />}
            {isFormModalOpen && <EquipmentFormModal equipment={editingEquipment} onClose={handleCloseFormModal} onSave={handleSave} currentUser={currentUser} />}
        </div>
    );
};

export default EquipmentList;