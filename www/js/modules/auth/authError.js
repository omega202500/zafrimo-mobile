// Traduit les codes d'erreur renvoyes par AuthService.
const ERROR_KEYS = {
  'required-fields': 'authError.requiredFields',
  'required-email': 'authError.requiredEmail',
  'invalid-email': 'authError.invalidEmail',
  'invalid-credentials': 'authError.invalidCredentials',
  'invalid-code': 'authError.invalidCode',
  'weak-password': 'authError.weakPassword',
  'account-suspended': 'authError.accountSuspended',
  'email-taken': 'authError.emailTaken',
  'network': 'authError.network'
};

export function authErrorMessage(error, t) {
  return t(ERROR_KEYS[error?.message] || 'authError.generic');
}
