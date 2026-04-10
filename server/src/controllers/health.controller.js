const getHealth = (request, response) => {
  void request;

  response.status(200).json({
    success: true,
    message: "Server is running"
  });
};

export { getHealth };
