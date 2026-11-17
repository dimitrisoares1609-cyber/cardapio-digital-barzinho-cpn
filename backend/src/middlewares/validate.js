import { HttpError } from '../utils/http-error.js';

/**
 * Valida req.body / req.query / req.params com um schema do zod.
 * Em caso de erro devolve 400 com a lista de campos inválidos.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new HttpError(400, 'VALIDATION_ERROR', 'Dados inválidos', details);
    }
    // req.query é somente leitura no Express 5, então guardamos o resultado em req.valid
    req.valid = { ...(req.valid || {}), [source]: result.data };
    next();
  };
}
