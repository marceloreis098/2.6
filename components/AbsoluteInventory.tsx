import React, { useState, useEffect } from 'react';
import { Equipment } from '../types';
import { getAbsoluteInventory } from '../services/apiService';
import Icon from './common/Icon';

const AbsoluteInventory: React.FC = () => {
    const [devices, setDevices] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAbsoluteInventory();
            setDevices(data);
        } catch (err: any) {
            setError('Falha ao buscar dados do inventário Absolute. Verifique a conexão com a API.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary">Inventário - Absolute Resilience</h2>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 self-start sm:self-center disabled:bg-gray-400"
                >
                    <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                Esta página exibe uma visualização dos dispositivos reportados pela integração com o Absolute Resilience. Para adicionar ou atualizar estes itens no inventário principal, utilize a função "Sincronizar com Absolute" na página de <strong className="font-semibold">Inventário de Equipamentos</strong>.
            </p>

            {loading ? (
                <div className="flex justify-center items-center py-10">
                    <Icon name="LoaderCircle" className="animate-spin text-brand-primary" size={48} />
                </div>
            ) : error ? (
                <div className="text-center py-10 text-red-500">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700 dark:text-dark-text-secondary">
                        <thead className="text-xs text-gray-800 dark:text-dark-text-primary uppercase bg-gray-100 dark:bg-gray-900/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Equipamento</th>
                                <th scope="col" className="px-6 py-3">Patrimônio</th>
                                <th scope="col" className="px-6 py-3">Serial</th>
                                <th scope="col" className="px-6 py-3">Usuário Atual</th>
                                <th scope="col" className="px-6 py-3">Local</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map(item => (
                                <tr key={item.id} className="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-dark-text-primary">{item.equipamento}</td>
                                    <td className="px-6 py-4 text-brand-primary font-semibold">{item.patrimonio || 'N/A'}</td>
                                    <td className="px-6 py-4">{item.serial || 'N/A'}</td>
                                    <td className="px-6 py-4">{item.usuarioAtual || 'N/A'}</td>
                                    <td className="px-6 py-4">{item.local || 'N/A'}</td>
                                    <td className="px-6 py-4">{item.status || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {devices.length === 0 && (
                        <div className="text-center py-10 text-gray-500 dark:text-dark-text-secondary">Nenhum dispositivo encontrado no Absolute.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AbsoluteInventory;
