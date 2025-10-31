

import React from 'react';
import { Equipment, User } from '../types';
import Icon from './common/Icon';

interface TermoProps {
    equipment: Equipment;
    user: User;
    onClose: () => void;
    companyName: string;
}

const TermoResponsabilidade: React.FC<TermoProps> = ({ equipment, user, onClose, companyName }) => {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const equipmentUser = equipment.usuarioAtual || user.realName;

    const termoContent = (
        <>
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold uppercase">Termo de Responsabilidade</h1>
                <p className="text-md mt-2">Utilização de Equipamento de Propriedade da Empresa</p>
            </div>

            <div className="space-y-4">
                <p><strong>Empresa:</strong> {companyName}</p>
                <p><strong>Colaborador(a):</strong> {equipmentUser}</p>
            </div>

            <div className="mt-6 border-t dark:border-dark-border pt-4">
                <h2 className="font-bold mb-2">Detalhes do Equipamento:</h2>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Equipamento:</strong> {equipment.equipamento}</li>
                    <li><strong>Patrimônio:</strong> {equipment.patrimonio || 'N/A'}</li>
                    <li><strong>Serial:</strong> {equipment.serial || 'N/A'}</li>
                </ul>
            </div>

            <div className="mt-6 text-justify space-y-3">
                <p>
                    Declaro, para todos os fins, ter recebido da empresa {companyName} o equipamento descrito acima, em perfeitas condições de uso e funcionamento, para meu uso exclusivo no desempenho de minhas funções profissionais.
                </p>
                <p>
                    Comprometo-me a zelar pela guarda, conservação e bom uso do equipamento, utilizando-o de acordo com as políticas de segurança e normas da empresa. Estou ciente de que o equipamento é uma ferramenta de trabalho e não deve ser utilizado para fins pessoais não autorizados.
                </p>
                <p>
                    Em caso de dano, perda, roubo ou qualquer outro sinistro, comunicarei imediatamente meu gestor direto e o departamento de TI. Comprometo-me a devolver o equipamento nas mesmas condições em que o recebi, ressalvado o desgaste natural pelo uso normal, quando solicitado pela empresa ou ao término do meu contrato de trabalho.
                </p>
            </div>

            <div className="mt-12 text-center">
                <p>________________________________________________</p>
                <p className="mt-1 font-semibold">{equipmentUser}</p>
            </div>
            
            <div className="mt-8 text-center">
                <p>{`Local e Data: ${today}`}</p>
            </div>
        </>
    );

    const handleEmail = () => {
        const subject = `Termo de Responsabilidade - ${equipment.equipamento}`;
        const body = `
TERMO DE RESPONSABILIDADE - ${companyName}

Colaborador(a): ${equipmentUser}

Equipamento:
- Descrição: ${equipment.equipamento}
- Patrimônio: ${equipment.patrimonio || 'N/A'}
- Serial: ${equipment.serial || 'N/A'}

Declaro ter recebido o equipamento acima em perfeitas condições para uso profissional. Comprometo-me a zelar por sua conservação e a utilizá-lo de acordo com as políticas da empresa. Comunicarei imediatamente qualquer dano ou perda e devolverei o equipamento ao final do vínculo empregatício ou quando solicitado.

${today}

_________________________
${equipmentUser}
        `.trim().replace(/\n/g, '%0D%0A');

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4 print:bg-white print:p-0">
            <div id="termo-modal" className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col print:shadow-none print:border print:max-h-full print:rounded-none">
                <div className="p-4 border-b dark:border-dark-border flex justify-between items-center print:hidden">
                    <h3 className="text-lg font-bold text-brand-dark dark:text-dark-text-primary">Termo de Responsabilidade</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                        <Icon name="X" size={24} />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto text-gray-800 dark:text-dark-text-primary">
                    {termoContent}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-dark-card/50 border-t dark:border-dark-border flex justify-end gap-3 print:hidden">
                    <button onClick={handleEmail} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
                        <Icon name="Mail" size={16}/> Enviar por E-mail
                    </button>
                    <button onClick={() => window.print()} className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 flex items-center gap-2">
                        <Icon name="Printer" size={16}/> Imprimir
                    </button>
                    <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermoResponsabilidade;