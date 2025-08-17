// Teste específico para normalização de CPF
function normalizeCPF(cpf) {
  if (!cpf) return '';
  
  // Remove tudo que não é número (pontos, traços, espaços, etc.)
  const normalized = String(cpf).replace(/[^0-9]/g, '');
  
  console.log(`CPF "${cpf}" -> "${normalized}" (${normalized.length} dígitos)`);
  
  // CPF deve ter exatamente 11 dígitos, CNPJ 14
  if (normalized.length === 11 || normalized.length === 14) {
    return normalized;
  }
  
  return ''; // Retorna vazio se não for um CPF/CNPJ válido
}

console.log('🧪 TESTANDO NORMALIZAÇÃO DE CPF:');
console.log('');

// Testar diferentes formatos
const testCpfs = [
  '304.268.648-59',
  '30426864859', 
  '304.268.648-59 ',
  ' 304.268.648-59',
  '304 268 648 59',
  '304-268-648-59',
  '123.456.789-01',
  '12345678901',
  '29.188.305/0001-50', // CNPJ
  '29188305000150'
];

testCpfs.forEach(cpf => {
  const result = normalizeCPF(cpf);
  console.log(`✅ "${cpf}" -> "${result}" ${result ? '(VÁLIDO)' : '(INVÁLIDO)'}`);
});

console.log('');
console.log('🔍 TESTE ESPECÍFICO - CPF mencionado:');
const cpfProblematico = '304.268.648-59';
const normalizado = normalizeCPF(cpfProblematico);
console.log(`CPF problema: "${cpfProblematico}"`);
console.log(`Normalizado: "${normalizado}"`);
console.log(`Match seria: "${normalizado}" === "30426864859" ? ${normalizado === '30426864859'}`);