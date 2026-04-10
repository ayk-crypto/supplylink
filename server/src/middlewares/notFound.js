const notFound = (request, response, next) => {
  void request;
  void next;

  response.status(404).json({
    success: false,
    message: "Route not found"
  });
};

export default notFound;
