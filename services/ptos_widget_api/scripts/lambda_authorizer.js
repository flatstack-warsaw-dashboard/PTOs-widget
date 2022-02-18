exports.handler = async (event) => {
  let isAuthorized = false;
  if (event.requestContext.http.sourceIp == "206.81.31.122") {
    isAuthorized = true
  }
  return {
    isAuthorized: isAuthorized
  };
};
