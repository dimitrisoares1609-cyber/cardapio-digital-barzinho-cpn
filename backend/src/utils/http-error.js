// Erro com status HTTP e código estável, convertido em JSON pelo middleware de erros
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Autenticação necessária') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  static notFound(message = 'Recurso não encontrado') {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message) {
    return new HttpError(409, 'CONFLICT', message);
  }

  static unprocessable(message, details) {
    return new HttpError(422, 'UNPROCESSABLE', message, details);
  }
}
