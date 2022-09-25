const https = require('https');

const checkIP = (currentIp) => {
  return new Promise((resolve, reject) => {
    https.request('https://2nq5n2w6zl.execute-api.eu-central-1.amazonaws.com/check_ip', {
      method: 'HEAD',
      headers: { 'X-Real-IP': currentIp }
    }, (res) => {
      resolve(res.statusCode);
    }).on('error', (err) => {
      reject(err);
    }).end();
  });
};

exports.handler = async (event) => {
  let isAuthorized = false;

  const status = await checkIP(event.requestContext.http.sourceIp);
  if (status == 200) {
    isAuthorized = true;
  }

  return {
    isAuthorized: isAuthorized
  };
};
