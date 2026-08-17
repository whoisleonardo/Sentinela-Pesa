import { NextFunction, Request, Response } from 'express';

// Express 4 não captura promises rejeitadas retornadas por handlers async —
// sem isto, um erro em qualquer `await` vira unhandled rejection (trava a
// requisição ou derruba o processo) e o middleware de erro em index.ts nunca
// é chamado. Este wrapper encaminha a rejeição para next(err).
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<any>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
