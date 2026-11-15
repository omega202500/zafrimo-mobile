// Utilitaire de validation des formulaires
class Validator {
  // Validation e-mail (format standard)
  static email(value) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  }

  // Validation champ obligatoire
  static required(value) {
    return value && value.trim().length > 0;
  }

  // Validation longueur minimale
  static minLength(value, min) {
    return value && value.length >= min;
  }

  // Validation mot de passe (minimum 8 caractères)
  static password(value) {
    return this.minLength(value, 8);
  }

  // Validation correspondance de deux champs (ex: password confirmation)
  static match(value, otherValue) {
    return value === otherValue;
  }

  // Validation personnalisée avec tableau de règles
  static validate(value, rules) {
    const errors = [];
    for (const rule of rules) {
      const { type, param, message } = rule;
      let isValid = true;

      switch (type) {
        case 'required':
          isValid = this.required(value);
          break;
        case 'email':
          isValid = this.email(value);
          break;
        case 'minLength':
          isValid = this.minLength(value, param);
          break;
        case 'password':
          isValid = this.password(value);
          break;
        case 'match':
          isValid = this.match(value, param);
          break;
      }

      if (!isValid) {
        errors.push(message);
      }
    }
    return errors;
  }
}
export default Validator;
