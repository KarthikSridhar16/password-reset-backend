const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  if (!res.headersSent) {
    res.status(500).json({
      message: err.message || "An unexpected error occurred",
    });
  }
};

export default errorMiddleware;
