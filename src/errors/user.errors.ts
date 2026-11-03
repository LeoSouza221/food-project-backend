export class UserNotFoundError extends Error {
  constructor(options?: ErrorOptions) {
    super('User not found.', options);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidUserDataError extends Error {
  constructor() {
    super('Invalid user data');
    this.name = 'InvalidUserDataError';
  }
}

export class InvalidUserUpdateError extends Error {
  constructor() {
    super('Invalid user update data');
    this.name = 'InvalidUserUpdateError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor() {
    super('User already exists');
    this.name = 'UserAlreadyExistsError';
  }
}

export class EmailAlreadyInUseError extends UserAlreadyExistsError {
  constructor() {
    super();
    this.message = 'Email already in use';
    this.name = 'EmailAlreadyInUseError';
  }
}

export class PhoneAlreadyInUseError extends UserAlreadyExistsError {
  constructor() {
    super();
    this.message = 'Phone already in use';
    this.name = 'PhoneAlreadyInUseError';
  }
}
