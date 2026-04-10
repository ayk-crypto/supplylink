const errorHandler = (error, request, response, next) => {
  void request;
  void next;

  response.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
};

export default errorHandler;
