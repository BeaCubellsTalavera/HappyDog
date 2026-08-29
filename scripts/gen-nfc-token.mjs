import { randomUUID } from 'node:crypto';

const token = randomUUID();

console.log('');
console.log('Token NFC generado:');
console.log('');
console.log('  ' + token);
console.log('');
console.log('Pega este valor en Firestore Console (happydog-prod):');
console.log('  Collection: config');
console.log('  Document ID: nfc');
console.log('  Field: token (string) = ' + token);
console.log('');
console.log('URL para grabar en la pegatina NFC:');
console.log('  https://happy-dog-alpha.vercel.app/feed?token=' + token);
console.log('');
