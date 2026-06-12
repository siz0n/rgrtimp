export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';

  return res.status(status).json({
    message,
  });
}