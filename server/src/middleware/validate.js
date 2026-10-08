import { ApiError } from '../utils/ApiError.js';

export function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query);
      if (params) req.params = params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || 'root';
          if (!details[key]) details[key] = [];
          details[key].push(issue.message);
        }
        return next(new ApiError(422, 'VALIDATION_ERROR', 'Validation failed', details));
      }
      next(err);
    }
  };
}
