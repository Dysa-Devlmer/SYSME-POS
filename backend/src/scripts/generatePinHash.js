import bcrypt from 'bcrypt';

const pin = '1234';
const hash = await bcrypt.hash(pin, 12);
console.log(`PIN: ${pin}`);
console.log(`Hash: ${hash}`);