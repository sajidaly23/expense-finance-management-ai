export class AppError extends Error {
  statusCode: number;
  status: 'error';

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.status = 'error';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
