exports.handler = async (event) => {
  let isAuthorized = false;
  if (event.requestContext.http.sourceIp == process.env.ALLOWED_IP) {
    isAuthorized = true
  }
  return {
    isAuthorized: isAuthorized
  };
};
