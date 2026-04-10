const asyncHandler = (handler) => async (request, response, next) => {
  try {
    await Promise.resolve(handler(request, response, next));
  } catch (error) {
    next(error);
  }
};

export default asyncHandler;
