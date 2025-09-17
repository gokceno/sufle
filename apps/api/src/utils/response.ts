export const noModelFound = (model: string) => {
  return {
    error: {
      message: `The model '${model}' does not exist`,
      type: "invalid_request_error",
      param: "model",
      code: "model_not_found",
    },
  };
};

export const streamingNotSupported = () => {
  return {
    error: {
      message: "Streaming is not supported by this model",
      type: "invalid_request_error",
      param: "stream",
      code: "invalid_request",
    },
  };
};

export const noUserMessage = () => {
  return {
    error: {
      message: "No user message found",
      type: "invalid_request_error",
      param: "messages",
      code: "invalid_request",
    },
  };
};

export const missingRequiredFields = () => {
  return {
    error: {
      message: "Missing required fields: model and messages",
      type: "invalid_request_error",
      param: null,
      code: "invalid_request",
    },
  };
};
