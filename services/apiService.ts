import { User, Equipment, EquipmentHistory, License, DbStatus, AuditLogEntry } from '../types';
import LogService from './logService';

const API_BASE_URL = `http://${window.location.hostname}:3001/api`;

const handleResponse = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) {
        const errorMessage = data.message || 'Ocorreu um erro na API.';
        LogService.add(errorMessage, `Status: ${response.status} URL: ${response.url}`, 'API_ERROR');
        throw new Error(errorMessage);
    }
    return data;
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
});

// Auth
export const login = async (credentials: { username: string, password?: string }): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
}

export const verify2FA = async (userId: number, token: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, token }),
    });
    return handleResponse(response);
};

export const generate2FASecret = async (userId: number): Promise<{ secret: string; qrCodeUrl: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
};

export const enable2FA = async (userId: number, secret: string, token: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, secret, token }),
    });
    return handleResponse(response);
};

export const disable2FA = async (userId: number): Promise<User> => {
     const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
    });
    return handleResponse(response);
}


// Equipment
export const getEquipment = async (): Promise<Equipment[]> => {
    const response = await fetch(`${API_BASE_URL}/equipment`);
    return handleResponse(response);
};

export const getEquipmentHistory = async (equipmentId: number): Promise<EquipmentHistory[]> => {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}/history`);
    return handleResponse(response);
};

export const addEquipment = async (equipmentData: Omit<Equipment, 'id'>, addedBy: string): Promise<Equipment> => {
    const response = await fetch(`${API_BASE_URL}/equipment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...equipmentData, changedBy: addedBy }),
    });
    return handleResponse(response);
};

export const updateEquipment = async (equipmentData: Equipment, changedBy: string): Promise<Equipment> => {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentData.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...equipmentData, changedBy }),
    });
    return handleResponse(response);
};

export const deleteEquipment = async (equipmentId: number, deletedBy: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/equipment/${equipmentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ deletedBy }),
    });
    return handleResponse(response);
};

export const importEquipment = async (equipmentData: Omit<Equipment, 'id'>[]): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/equipment/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(equipmentData),
    });
    return handleResponse(response);
};

export const clearAllEquipment = async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/equipment/all`, {
        method: 'DELETE',
    });
    return handleResponse(response);
};

// Licenses
export const getLicenses = async (): Promise<License[]> => {
    const response = await fetch(`${API_BASE_URL}/licenses`);
    return handleResponse(response);
};

export const addLicense = async (licenseData: Omit<License, 'id'>, addedBy: string): Promise<License> => {
    const response = await fetch(`${API_BASE_URL}/licenses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...licenseData, changedBy: addedBy }),
    });
    return handleResponse(response);
};

export const updateLicense = async (licenseData: License, changedBy: string): Promise<License> => {
    const response = await fetch(`${API_BASE_URL}/licenses/${licenseData.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...licenseData, changedBy }),
    });
    return handleResponse(response);
};

export const deleteLicense = async (licenseId: number, deletedBy: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ deletedBy }),
    });
    return handleResponse(response);
};

export const importLicenses = async (productName: string, licenseData: Omit<License, 'id'>[], changedBy: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/licenses/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productName, licenses: licenseData, changedBy }),
    });
    return handleResponse(response);
};

export const renameProduct = async (oldName: string, newName: string, changedBy: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/licenses/rename-product`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ oldName, newName, changedBy }),
    });
    return handleResponse(response);
};


// Users
export const getUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE_URL}/users`);
    return handleResponse(response);
};

export const addUser = async (userData: Omit<User, 'id' | 'language' | 'authentication' | 'modulePermissions' | 'groups' | 'lastLogin'>, addedBy: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...userData, changedBy: addedBy }),
    });
    return handleResponse(response);
};

export const updateUser = async (userData: User, changedBy: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/${userData.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...userData, changedBy }),
    });
    return handleResponse(response);
};

export const deleteUser = async (userId: number, deletedBy: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ deletedBy }),
    });
    return handleResponse(response);
};

export const disableUser2FA = async (userId: number): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/disable-2fa`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
};

// Database Management
export const getDatabaseStatus = async (): Promise<DbStatus> => {
    const response = await fetch(`${API_BASE_URL}/database/status`);
    return handleResponse(response);
};

export const backupDatabase = async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/database/backup`, {
        method: 'POST',
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ocorreu um erro ao criar o backup.');
    }

    return response.blob();
};

export const restoreDatabase = async (backupData: any): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/database/restore`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(backupData),
    });
    return handleResponse(response);
};

export const resetDatabase = async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/database/reset`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
};


// Audit Log
export const getAuditLog = async (): Promise<AuditLogEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/audit-log`);
    return handleResponse(response);
};

// Absolute Integration
export const getAbsoluteInventory = async (): Promise<Equipment[]> => {
    const response = await fetch(`${API_BASE_URL}/integrations/absolute/inventory`);
    return handleResponse(response);
};

export const testAbsoluteConnection = async (credentials: { tokenId: string, secretKey: string }): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/absolute/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};

export const syncWithAbsolute = async (syncedBy: string): Promise<{ message: string; added: number; updated: number; }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/absolute/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ syncedBy }),
    });
    return handleResponse(response);
};

export const saveAbsoluteConfig = async (credentials: { tokenId: string, secretKey: string }): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/absolute/config`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
};
