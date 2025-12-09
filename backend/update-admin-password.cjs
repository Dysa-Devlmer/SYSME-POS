const Database = require('better-sqlite3');

const db = new Database('./data/sysme.db');

const newHash = '$2b$12$vaE9KI0oUWVKekCDD7TuRORIauPO78oWvX73kt2znV3pIhoqRNJ0C';

db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newHash, 'admin');

console.log('✅ Contraseña del usuario admin actualizada exitosamente');
console.log('');
console.log('==============================================');
console.log('CREDENCIALES DE ACCESO:');
console.log('Usuario: admin');
console.log('Contraseña: admin123');
console.log('==============================================');
console.log('');

db.close();
