export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
