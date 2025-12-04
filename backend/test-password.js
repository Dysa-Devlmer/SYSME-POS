const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

// Get admin password hash from database
const db = new Database('./data/sysme.db');
const admin = db.prepare('SELECT username, password FROM users WHERE username = ?').get('admin');
db.close();

console.log('Usuario admin encontrado');
console.log('Hash:', admin.password);
console.log('\nProbando contraseñas comunes...\n');

const passwords = [
  'admin',
  'admin123',
  'Admin123',
  'password',
  'Password123',
  'sysme',
  'Sysme123',
  'SYSME',
  '123456',
  'restaurant',
  'Restaurant123'
];

passwords.forEach(p => {
  try {
    const match = bcrypt.compareSync(p, admin.password);
    if (match) {
      console.log(`✅ CONTRASEÑA ENCONTRADA: "${p}"`);
      console.log(`\n==============================================`);
      console.log(`CREDENCIALES DE ACCESO:`);
      console.log(`Usuario: ${admin.username}`);
      console.log(`Contraseña: ${p}`);
      console.log(`==============================================\n`);
      process.exit(0);
    } else {
      console.log(`❌ "${p}" no coincide`);
    }
  } catch (error) {
    console.log(`⚠️  Error probando "${p}": ${error.message}`);
  }
});

console.log('\n❌ No se encontró la contraseña entre las opciones comunes');
console.log('Generando nueva contraseña...\n');

// Generate new password hash
const newPassword = 'admin123';
const newHash = bcrypt.hashSync(newPassword, 12);
console.log(`Nueva contraseña: "${newPassword}"`);
console.log(`Nuevo hash: ${newHash}`);
console.log('\nEjecuta el siguiente comando para actualizarla:');
console.log(`node -e "const Database = require('better-sqlite3'); const db = new Database('./data/sysme.db'); db.prepare('UPDATE users SET password = ? WHERE username = ?').run('${newHash}', 'admin'); console.log('Contraseña actualizada'); db.close();"`);
