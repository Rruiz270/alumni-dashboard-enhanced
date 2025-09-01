class CPFCNPJUtils {
  // Remove all non-numeric characters
  static normalize(cpfCnpj) {
    if (!cpfCnpj) return '';
    return cpfCnpj.replace(/\D/g, '');
  }

  // Format CPF: 000.000.000-00
  static formatCPF(cpf) {
    const normalized = this.normalize(cpf);
    if (normalized.length !== 11) return cpf;
    
    return normalized.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }

  // Format CNPJ: 00.000.000/0000-00
  static formatCNPJ(cnpj) {
    const normalized = this.normalize(cnpj);
    if (normalized.length !== 14) return cnpj;
    
    return normalized.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }

  // Auto-detect and format
  static format(cpfCnpj) {
    const normalized = this.normalize(cpfCnpj);
    
    if (normalized.length === 11) {
      return this.formatCPF(normalized);
    } else if (normalized.length === 14) {
      return this.formatCNPJ(normalized);
    }
    
    return cpfCnpj;
  }

  // Check if it's a CPF (individual)
  static isCPF(cpfCnpj) {
    const normalized = this.normalize(cpfCnpj);
    return normalized.length === 11;
  }

  // Check if it's a CNPJ (business)
  static isCNPJ(cpfCnpj) {
    const normalized = this.normalize(cpfCnpj);
    return normalized.length === 14;
  }

  // Get type
  static getType(cpfCnpj) {
    if (this.isCPF(cpfCnpj)) return 'CPF';
    if (this.isCNPJ(cpfCnpj)) return 'CNPJ';
    return 'INVALID';
  }

  // Validate CPF
  static validateCPF(cpf) {
    const normalized = this.normalize(cpf);
    
    if (normalized.length !== 11) return false;
    
    // Check for known invalid patterns
    if (/^(\d)\1{10}$/.test(normalized)) return false;
    
    // Validate first digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(normalized[i]) * (10 - i);
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(normalized[9]) !== digit1) return false;
    
    // Validate second digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(normalized[i]) * (11 - i);
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(normalized[10]) === digit2;
  }

  // Validate CNPJ
  static validateCNPJ(cnpj) {
    const normalized = this.normalize(cnpj);
    
    if (normalized.length !== 14) return false;
    
    // Check for known invalid patterns
    if (/^(\d)\1{13}$/.test(normalized)) return false;
    
    // Validate first digit
    let sum = 0;
    let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 12; i++) {
      sum += parseInt(normalized[i]) * weight[i];
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(normalized[12]) !== digit1) return false;
    
    // Validate second digit
    sum = 0;
    weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 13; i++) {
      sum += parseInt(normalized[i]) * weight[i];
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(normalized[13]) === digit2;
  }

  // Validate CPF or CNPJ
  static validate(cpfCnpj) {
    const normalized = this.normalize(cpfCnpj);
    
    if (normalized.length === 11) {
      return this.validateCPF(normalized);
    } else if (normalized.length === 14) {
      return this.validateCNPJ(normalized);
    }
    
    return false;
  }

  // Compare two CPF/CNPJ values (ignoring formatting)
  static areEqual(cpfCnpj1, cpfCnpj2) {
    return this.normalize(cpfCnpj1) === this.normalize(cpfCnpj2);
  }
}

module.exports = CPFCNPJUtils;