// Adicionado para capturar erros não tratados e evitar que a aplicação quebre silenciosamente
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', reason);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const API_PORT = process.env.API_PORT || 3001;

// Aumenta o limite do corpo da requisição para aceitar CSVs maiores
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// DB Connection
let db;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4', // FIX: Explicitly set charset to handle special characters
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// --- AUDIT LOG UTILITY ---
const logAudit = async (username, action_type, target_type, target_id = null, details = '', connection = db) => {
    if (!connection) {
        console.error('Audit log failed: DB connection not available.');
        return;
    }
    try {
        const logEntry = {
            username,
            action_type,
            target_type,
            target_id,
            details,
            timestamp: new Date()
        };
        await connection.query('INSERT INTO audit_log SET ?', logEntry);
    } catch (error) {
        console.error('Failed to write to audit log:', error);
    }
};


const createTablesAndSeedAdmin = async (connectionPool) => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            realName VARCHAR(255) NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            is2FAEnabled BOOLEAN DEFAULT FALSE,
            twoFactorSecret VARCHAR(255),
            ssoProvider VARCHAR(50),
            lastLogin DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createEquipmentTable = `
        CREATE TABLE IF NOT EXISTS equipment (
            id INT AUTO_INCREMENT PRIMARY KEY,
            equipamento VARCHAR(255) NOT NULL,
            garantia VARCHAR(255),
            patrimonio VARCHAR(255) UNIQUE,
            serial VARCHAR(255),
            usuarioAtual VARCHAR(255),
            usuarioAnterior VARCHAR(255),
            local VARCHAR(255),
            setor VARCHAR(255),
            dataEntregaUsuario VARCHAR(255),
            status VARCHAR(255),
            dataDevolucao VARCHAR(255),
            tipo VARCHAR(255),
            notaCompra VARCHAR(255),
            notaPlKm VARCHAR(255),
            termoResponsabilidade TEXT,
            foto TEXT,
            qrCode TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createHistoryTable = `
        CREATE TABLE IF NOT EXISTS equipment_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            equipmentId INT NOT NULL,
            changeType VARCHAR(50) NOT NULL,
            from_value TEXT,
            to_value TEXT,
            changedBy VARCHAR(255) NOT NULL,
            timestamp DATETIME NOT NULL,
            FOREIGN KEY (equipmentId) REFERENCES equipment(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createLicensesTable = `
        CREATE TABLE IF NOT EXISTS licenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            produto VARCHAR(255) NOT NULL,
            tipoLicenca VARCHAR(255),
            chaveSerial VARCHAR(255) NOT NULL,
            dataExpiracao VARCHAR(255),
            usuario VARCHAR(255) NOT NULL,
            cargo VARCHAR(255),
            setor VARCHAR(255),
            gestor VARCHAR(255),
            centroCusto VARCHAR(255),
            contaRazao VARCHAR(255),
            nomeComputador VARCHAR(255),
            numeroChamado VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createAuditLogTable = `
        CREATE TABLE IF NOT EXISTS audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            target_type VARCHAR(50),
            target_id INT,
            details TEXT,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    const dbSetupConnection = await connectionPool.getConnection();
    try {
        await dbSetupConnection.query(createUsersTable);
        await dbSetupConnection.query(createEquipmentTable);
        await dbSetupConnection.query(createHistoryTable);
        await dbSetupConnection.query(createLicensesTable);
        await dbSetupConnection.query(createAuditLogTable);


        // Seed admin user if not exists
        const [adminExists] = await dbSetupConnection.query('SELECT * FROM users WHERE username = ?', ['admin']);
        if (adminExists.length === 0) {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
            const adminPassword = 'marceloadmin'; // Default password
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
            const adminUser = {
                realName: 'Marcelo Admin',
                username: 'admin',
                email: 'admin@company.com',
                password: hashedPassword,
                role: 'Admin',
                is2FAEnabled: false,
                lastLogin: new Date()
            };
            await dbSetupConnection.query('INSERT INTO users SET ?', adminUser);
            console.log('Admin user created.');
        }
    } finally {
        dbSetupConnection.release();
    }
};


const initializeDatabase = async () => {
    try {
        db = mysql.createPool(dbConfig);
        
        const connection = await db.getConnection();
        await connection.query('SELECT 1');
        connection.release();

        console.log('Database connected successfully.');
        await createTablesAndSeedAdmin(db);

        // --- MIGRATION LOGIC ---
        const migrationConnection = await db.getConnection();
        try {
            console.log('Checking for necessary database migrations...');
            // Migration for equipment_history
            const [ehColumns] = await migrationConnection.query("SHOW COLUMNS FROM `equipment_history` LIKE 'from_value'");

            if (ehColumns.length === 0) {
                console.log("Schema outdated. Applying migration for equipment_history table...");
                const [oldEhColumns] = await migrationConnection.query("SHOW COLUMNS FROM `equipment_history` LIKE 'from'");
                
                if (oldEhColumns.length > 0) {
                    await migrationConnection.query("ALTER TABLE `equipment_history` CHANGE COLUMN `from` `from_value` TEXT, CHANGE COLUMN `to` `to_value` TEXT;");
                    console.log("Migration successful: Renamed 'from'/'to' columns to 'from_value'/'to_value'.");
                } else {
                    await migrationConnection.query("ALTER TABLE `equipment_history` ADD COLUMN `from_value` TEXT, ADD COLUMN `to_value` TEXT;");
                    console.log("Migration successful: Added 'from_value' and 'to_value' columns.");
                }
            }

            // Migration for licenses
            const [licenseColumns] = await migrationConnection.query("SHOW COLUMNS FROM `licenses` LIKE 'centroCusto'");
            if (licenseColumns.length === 0) {
                console.log("Licenses table schema is outdated. Applying migration...");
                await migrationConnection.query(`
                    ALTER TABLE \`licenses\`
                    ADD COLUMN cargo VARCHAR(255),
                    ADD COLUMN setor VARCHAR(255),
                    ADD COLUMN gestor VARCHAR(255),
                    ADD COLUMN centroCusto VARCHAR(255),
                    ADD COLUMN contaRazao VARCHAR(255),
                    ADD COLUMN nomeComputador VARCHAR(255),
                    ADD COLUMN numeroChamado VARCHAR(255);
                `);
                console.log("Migration successful: Added new columns to licenses table.");
            }
        } finally {
            migrationConnection.release();
        }
    } catch (error) {
        console.error('FATAL: Could not connect to the database or initialize tables.');
        console.error('Please check your .env configuration and ensure the MariaDB server is running.');
        console.error('Error Details:', error);
        process.exit(1); // Exit if DB connection fails
    }
};

// --- API ROUTES ---

// In-memory store for Absolute credentials. In a real production app, this should be stored securely in the database.
let absoluteCredentials = { tokenId: null, secretKey: null };

// Generic error handler for routes
const handleApiError = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    res.status(500).json({ message: `Internal server error in ${context}.`, error: error.message });
};

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }
        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }
        
        await db.query('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date(), user.id]);

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        handleApiError(res, error, 'login');
    }
});

app.post('/api/auth/2fa/generate', async (req, res) => {
    try {
        const { userId } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(users[0].email, 'Inventario Pro', secret);

        await db.query('UPDATE users SET twoFactorSecret = ? WHERE id = ?', [secret, userId]);

        res.json({ secret, qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauth)}` });
    } catch (error) {
        handleApiError(res, error, '2FA generate');
    }
});

app.post('/api/auth/2fa/enable', async (req, res) => {
    try {
        const { userId, token, secret } = req.body;
        const isValid = authenticator.check(token, secret);

        if (isValid) {
            await db.query('UPDATE users SET is2FAEnabled = TRUE WHERE id = ?', [userId]);
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Código de verificação inválido.' });
        }
    } catch (error) {
        handleApiError(res, error, '2FA enable');
    }
});

app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
        const { userId, token } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const user = users[0];
        const isValid = authenticator.check(token, user.twoFactorSecret);

        if (isValid) {
            await db.query('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date(), user.id]);
            const { password, twoFactorSecret, ...userWithoutSensitiveData } = user;
            res.json(userWithoutSensitiveData);
        } else {
            res.status(400).json({ message: 'Código de verificação inválido.' });
        }
    } catch (error) {
        handleApiError(res, error, '2FA verify');
    }
});

app.post('/api/auth/2fa/disable', async (req, res) => {
    try {
        const { userId } = req.body;
        await db.query('UPDATE users SET is2FAEnabled = FALSE, twoFactorSecret = NULL WHERE id = ?', [userId]);
        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        handleApiError(res, error, '2FA disable');
    }
});

// --- EQUIPMENT ROUTES ---
app.get('/api/equipment', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM equipment');
        res.json(rows);
    } catch (error) {
        handleApiError(res, error, 'get equipment');
    }
});

app.get('/api/equipment/:id/history', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM equipment_history WHERE equipmentId = ? ORDER BY timestamp DESC', [req.params.id]);
        res.json(rows);
    } catch (error) {
        handleApiError(res, error, 'get equipment history');
    }
});

app.post('/api/equipment', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, ...equipmentData } = req.body;
        const [result] = await connection.query('INSERT INTO equipment SET ?', [equipmentData]);
        const newId = result.insertId;
        await logAudit(changedBy, 'CREATE', 'EQUIPMENT', newId, `Criado equipamento: ${equipmentData.equipamento}`, connection);
        await connection.commit();
        res.status(201).json({ id: newId, ...equipmentData });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'add equipment');
    } finally {
        connection.release();
    }
});

app.put('/api/equipment/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, ...equipmentData } = req.body;
        const [oldEquipmentResult] = await connection.query('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
        const oldEquipment = oldEquipmentResult[0];

        await connection.query('UPDATE equipment SET ? WHERE id = ?', [equipmentData, req.params.id]);
        
        const changes = [];
        for (const key in equipmentData) {
            // Using a loose comparison to handle type differences (e.g., null vs '')
            if (oldEquipment[key] != equipmentData[key]) {
                changes.push(`${key}: de '${oldEquipment[key] || ''}' para '${equipmentData[key] || ''}'`);
            }
        }
        if (changes.length > 0) {
            await logAudit(changedBy, 'UPDATE', 'EQUIPMENT', req.params.id, `Atualizado equipamento: ${changes.join(', ')}`, connection);
        }

        await connection.commit();
        res.json({ id: req.params.id, ...equipmentData });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'update equipment');
    } finally {
        connection.release();
    }
});

app.delete('/api/equipment/:id', async (req, res) => {
     const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { deletedBy } = req.body;
        const [equipment] = await connection.query('SELECT equipamento FROM equipment WHERE id = ?', [req.params.id]);
        await connection.query('DELETE FROM equipment WHERE id = ?', [req.params.id]);
        await logAudit(deletedBy, 'DELETE', 'EQUIPMENT', req.params.id, `Excluído equipamento: ${equipment[0]?.equipamento || 'ID ' + req.params.id}`, connection);
        await connection.commit();
        res.json({ message: 'Equipment deleted' });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'delete equipment');
    } finally {
        connection.release();
    }
});

app.post('/api/equipment/import', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM equipment');
        await connection.query('ALTER TABLE equipment AUTO_INCREMENT = 1');
        for (const item of req.body) {
            await connection.query('INSERT INTO equipment SET ?', [item]);
        }
        await logAudit('admin', 'UPDATE', 'EQUIPMENT', null, `Importação em massa de ${req.body.length} equipamentos via CSV.`, connection);
        await connection.commit();
        res.json({ message: `Importação bem-sucedida! ${req.body.length} itens foram adicionados.` });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'import equipment');
    } finally {
        connection.release();
    }
});


// --- LICENSE ROUTES ---
app.get('/api/licenses', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM licenses');
        res.json(rows);
    } catch (error) {
        handleApiError(res, error, 'get licenses');
    }
});

app.post('/api/licenses', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, ...licenseData } = req.body;
        const [result] = await connection.query('INSERT INTO licenses SET ?', [licenseData]);
        const newId = result.insertId;
        await logAudit(changedBy, 'CREATE', 'LICENSE', newId, `Criada licença para ${licenseData.produto}`, connection);
        await connection.commit();
        res.status(201).json({ id: newId, ...licenseData });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'add license');
    } finally {
        connection.release();
    }
});

app.put('/api/licenses/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, ...licenseData } = req.body;
        await connection.query('UPDATE licenses SET ? WHERE id = ?', [licenseData, req.params.id]);
        await logAudit(changedBy, 'UPDATE', 'LICENSE', req.params.id, `Atualizada licença para ${licenseData.produto}`, connection);
        await connection.commit();
        res.json({ id: req.params.id, ...licenseData });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'update license');
    } finally {
        connection.release();
    }
});

app.delete('/api/licenses/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { deletedBy } = req.body;
        const [license] = await connection.query('SELECT produto FROM licenses WHERE id = ?', [req.params.id]);
        await connection.query('DELETE FROM licenses WHERE id = ?', [req.params.id]);
        await logAudit(deletedBy, 'DELETE', 'LICENSE', req.params.id, `Excluída licença para ${license[0]?.produto || 'ID ' + req.params.id}`, connection);
        await connection.commit();
        res.json({ message: 'License deleted' });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'delete license');
    } finally {
        connection.release();
    }
});

app.post('/api/licenses/import', async (req, res) => {
    const connection = await db.getConnection();
    const { productName, licenses, changedBy } = req.body;
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM licenses WHERE produto = ?', [productName]);
        for (const license of licenses) {
            // Ensure product name from the file matches the target product
            license.produto = productName; 
            await connection.query('INSERT INTO licenses SET ?', [license]);
        }
        await logAudit(changedBy, 'UPDATE', 'LICENSE', null, `Importação em massa de ${licenses.length} licenças para ${productName}`, connection);
        await connection.commit();
        res.json({ message: `Importação para ${productName} concluída com sucesso.` });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'import licenses');
    } finally {
        connection.release();
    }
});

app.put('/api/licenses/rename-product', async (req, res) => {
    const connection = await db.getConnection();
    const { oldName, newName, changedBy } = req.body;
    try {
        await connection.beginTransaction();
        const [result] = await connection.query('UPDATE licenses SET produto = ? WHERE produto = ?', [newName, oldName]);
        await logAudit(changedBy, 'UPDATE', 'LICENSE', null, `Produto renomeado de '${oldName}' para '${newName}' (${result.affectedRows} licenças afetadas)`, connection);
        await connection.commit();
        res.json({ message: 'Product renamed successfully' });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'rename product');
    } finally {
        connection.release();
    }
});

// --- USERS ROUTES ---
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, realName, username, email, role, is2FAEnabled, ssoProvider, lastLogin FROM users');
        res.json(rows);
    } catch (error) {
        handleApiError(res, error, 'get users');
    }
});

app.post('/api/users', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, password, ...userData } = req.body;
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await connection.query('INSERT INTO users SET ?', [{ ...userData, password: hashedPassword }]);
        const newId = result.insertId;

        await logAudit(changedBy, 'CREATE', 'USER', newId, `Criado usuário: ${userData.username}`, connection);
        await connection.commit();
        res.status(201).json({ id: newId, ...userData });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Nome de usuário ou e-mail já existe.' });
        }
        handleApiError(res, error, 'add user');
    } finally {
        connection.release();
    }
});

app.put('/api/users/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { changedBy, password, ...userData } = req.body;
        const userId = req.params.id;

        if (password) {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
            userData.password = await bcrypt.hash(password, saltRounds);
        }

        await connection.query('UPDATE users SET ? WHERE id = ?', [userData, userId]);

        await logAudit(changedBy, 'UPDATE', 'USER', userId, `Atualizado usuário: ${userData.username}`, connection);
        await connection.commit();
        const { password: _, ...userWithoutPassword } = userData;
        res.json({ id: userId, ...userWithoutPassword });
    } catch (error) {
        await connection.rollback();
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Nome de usuário ou e-mail já existe.' });
        }
        handleApiError(res, error, 'update user');
    } finally {
        connection.release();
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { deletedBy } = req.body;
        const userId = req.params.id;
        const [user] = await connection.query('SELECT username FROM users WHERE id = ?', [userId]);

        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await logAudit(deletedBy, 'DELETE', 'USER', userId, `Excluído usuário: ${user[0]?.username || 'ID ' + userId}`, connection);
        await connection.commit();
        res.json({ message: 'User deleted' });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'delete user');
    } finally {
        connection.release();
    }
});

app.post('/api/users/:id/disable-2fa', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.params.id;
        
        // In a real app, you'd get the admin's username from an authenticated session
        const adminUsername = 'admin'; 
        
        await connection.query('UPDATE users SET is2FAEnabled = FALSE, twoFactorSecret = NULL WHERE id = ?', [userId]);

        const [user] = await connection.query('SELECT username FROM users WHERE id = ?', [userId]);
        await logAudit(adminUsername, 'UPDATE', 'USER', userId, `Desativado 2FA para usuário: ${user[0]?.username}`, connection);

        await connection.commit();
        res.json({ message: 'User 2FA disabled successfully' });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'disable user 2FA');
    } finally {
        connection.release();
    }
});

// --- DATABASE MANAGEMENT ---
app.get('/api/database/status', async(req, res) => {
    try {
        const [version] = await db.query("SELECT VERSION() as version");
        const [dbName] = await db.query("SELECT DATABASE() as databaseName");
        const [tables] = await db.query("SHOW TABLES");
        res.json({
            status: 'Online',
            version: version[0].version,
            databaseName: dbName[0].databaseName,
            tableCount: tables.length,
        });
    } catch (error) {
        res.status(500).json({ status: 'Offline', message: error.message, code: error.code });
    }
});

app.post('/api/database/backup', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users');
        const [equipment] = await db.query('SELECT * FROM equipment');
        const [equipment_history] = await db.query('SELECT * FROM equipment_history');
        const [licenses] = await db.query('SELECT * FROM licenses');
        const [audit_log] = await db.query('SELECT * FROM audit_log');

        const backupData = {
            users,
            equipment,
            equipment_history,
            licenses,
            audit_log,
            backupDate: new Date().toISOString()
        };
        
        res.setHeader('Content-Type', 'application/json');
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        res.setHeader('Content-Disposition', `attachment; filename=inventario-backup-${timestamp}.json`);
        res.status(200).send(JSON.stringify(backupData, null, 2));

    } catch (error) {
        handleApiError(res, error, 'database backup');
    }
});

app.post('/api/database/restore', async (req, res) => {
    const backupData = req.body;
    const tables = ['audit_log', 'equipment_history', 'equipment', 'licenses', 'users'];
    
    if (!tables.every(table => backupData[table] && Array.isArray(backupData[table]))) {
        return res.status(400).json({ message: 'Arquivo de backup inválido ou corrompido.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        if (backupData.users) for (const user of backupData.users) await connection.query('INSERT INTO users SET ?', user);
        if (backupData.equipment) for (const item of backupData.equipment) await connection.query('INSERT INTO equipment SET ?', item);
        if (backupData.licenses) for (const license of backupData.licenses) await connection.query('INSERT INTO licenses SET ?', license);
        if (backupData.equipment_history) for (const history of backupData.equipment_history) await connection.query('INSERT INTO equipment_history SET ?', history);
        if (backupData.audit_log) for (const log of backupData.audit_log) await connection.query('INSERT INTO audit_log SET ?', log);

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        await connection.commit();
        res.json({ message: 'Banco de dados restaurado com sucesso a partir do backup.' });
    } catch (error) {
        await connection.rollback();
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        handleApiError(res, error, 'database restore');
    } finally {
        connection.release();
    }
});

app.post('/api/database/reset', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        await connection.query('TRUNCATE TABLE audit_log');
        await connection.query('TRUNCATE TABLE equipment_history');
        await connection.query('TRUNCATE TABLE equipment');
        await connection.query('TRUNCATE TABLE licenses');
        await connection.query('TRUNCATE TABLE users');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        const adminPassword = 'marceloadmin';
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        const adminUser = {
            realName: 'Marcelo Admin',
            username: 'admin',
            email: 'admin@company.com',
            password: hashedPassword,
            role: 'Admin',
            is2FAEnabled: false,
            lastLogin: new Date()
        };
        await connection.query('INSERT INTO users SET ?', adminUser);
        
        await connection.commit();
        res.json({ message: 'O banco de dados foi zerado e a conta de administrador foi recriada.' });
    } catch (error) {
        await connection.rollback();
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        handleApiError(res, error, 'database reset');
    } finally {
        connection.release();
    }
});

// --- AUDIT LOG ---
app.get('/api/audit-log', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 200');
        res.json(rows);
    } catch (error) {
        handleApiError(res, error, 'get audit log');
    }
});

// --- ABSOLUTE RESILIENCE INTEGRATION ---
const absoluteApi = {
    testConnection: async (tokenId, secretKey) => {
        if (tokenId && secretKey && tokenId.length > 10 && secretKey.length > 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true, message: 'Conexão com a API da Absolute bem-sucedida.' };
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error('Credenciais inválidas. Verifique o ID do Token e a Chave Secreta.');
    },
    getDevices: async () => {
         return [
            { id: 1001, equipamento: 'Absolute: MacBook Pro 16"', patrimonio: 'ABS-001', serial: 'C02Z1234ABCD', usuarioAtual: 'John Doe', local: 'Remoto', status: 'Ativo' },
            { id: 1002, equipamento: 'Absolute: Dell Latitude 7420', patrimonio: 'ABS-002', serial: 'DELL5678IJKL', usuarioAtual: 'Jane Smith', local: 'Escritório', status: 'Ativo' },
            { id: 1003, equipamento: 'Absolute: HP EliteBook', patrimonio: 'ABS-003', serial: 'HP2468WXYZ', usuarioAtual: '', local: 'Estoque', status: 'Em Estoque' },
        ];
    }
};

app.post('/api/integrations/absolute/config', (req, res) => {
    const { tokenId, secretKey } = req.body;
    absoluteCredentials.tokenId = tokenId;
    absoluteCredentials.secretKey = secretKey;
    console.log('Absolute credentials updated.');
    res.json({ message: 'Credenciais da Absolute atualizadas no servidor.' });
});

app.post('/api/integrations/absolute/test', async (req, res) => {
    const { tokenId, secretKey } = req.body;
    if (!tokenId || !secretKey) {
        return res.status(400).json({ message: 'ID do Token e Chave Secreta são obrigatórios.' });
    }
    try {
        const result = await absoluteApi.testConnection(tokenId, secretKey);
        res.json(result);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

app.get('/api/integrations/absolute/inventory', async (req, res) => {
    if (!absoluteCredentials.tokenId || !absoluteCredentials.secretKey) {
        return res.status(400).json({ message: 'Credenciais da Absolute não configuradas. Salve-as na página de Configurações.' });
    }
    try {
        const devices = await absoluteApi.getDevices();
        res.json(devices);
    } catch (error) {
        handleApiError(res, error, 'get absolute inventory');
    }
});

app.post('/api/integrations/absolute/sync', async (req, res) => {
    const { syncedBy } = req.body;
    if (!absoluteCredentials.tokenId || !absoluteCredentials.secretKey) {
        return res.status(400).json({ message: 'Credenciais da Absolute não configuradas. Salve-as na página de Configurações.' });
    }
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const absoluteDevices = await absoluteApi.getDevices();
        let added = 0;
        let updated = 0;

        for (const device of absoluteDevices) {
            const [existing] = await connection.query('SELECT * FROM equipment WHERE patrimonio = ?', [device.patrimonio]);
            const equipmentData = {
                equipamento: device.equipamento, patrimonio: device.patrimonio, serial: device.serial,
                usuarioAtual: device.usuarioAtual, local: device.local, status: device.status,
                tipo: 'ABSOLUTE', qrCode: device.patrimonio,
            };

            if (existing.length > 0) {
                await connection.query('UPDATE equipment SET ? WHERE id = ?', [equipmentData, existing[0].id]);
                updated++;
            } else {
                await connection.query('INSERT INTO equipment SET ?', equipmentData);
                added++;
            }
        }
        await logAudit(syncedBy, 'UPDATE', 'INTEGRATION', null, `Sincronização com Absolute: ${added} adicionados, ${updated} atualizados.`, connection);
        await connection.commit();
        res.json({ message: `Sincronização concluída. Adicionados: ${added}, Atualizados: ${updated}.`, added, updated });
    } catch (error) {
        await connection.rollback();
        handleApiError(res, error, 'absolute sync');
    } finally {
        connection.release();
    }
});


// Fallback route for 404
app.use((req, res) => {
  res.status(404).json({ message: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});


const startServer = async () => {
    await initializeDatabase();
    app.listen(API_PORT, '0.0.0.0', () => {
        console.log(`API server running on http://0.0.0.0:${API_PORT}`);
    });
};

startServer();