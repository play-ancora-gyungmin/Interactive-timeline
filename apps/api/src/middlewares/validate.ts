import { z } from 'zod';
import { RequestHandler } from 'express';
import { BadRequestException } from '../err/httpException.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * @param {z.ZodSchema<any>} schema 검사할 Zod 스키마
 * @param {'body' | 'query' | 'params'} type 검사할 요청 데이터의 위치
 * @returns {Function: RequestHandler} Express 미들웨어 함수
 */
export const validate =
  (
    schema: z.ZodSchema,
    type: ValidationTarget = 'body',
  ): RequestHandler =>
  async (req, _res, next) => {
    try {
      const dataToValidate = req[type] || {};
      const parsed = await schema.parseAsync(dataToValidate);
      req.validated = {
        ...req.validated,
        [type]: parsed,
      };
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          location: type,
        }));
        next(
          new BadRequestException(
            formattedErrors[0].message,
            formattedErrors as never[],
          ),
        );
      } else {
        next(error);
      }
    }
  };
