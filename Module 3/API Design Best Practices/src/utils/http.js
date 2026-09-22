function sendList(res, rows) {
  return res.status(200).json(rows);
}

function sendCreated(res, post) {
  return res.status(201).json({ data: post });
}

function sendOk(res, payload) {
  return res.status(200).json({ data: payload });
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error });
}

function sendInternalError(res, err) {
  console.error(err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}

module.exports = {
  sendList,
  sendCreated,
  sendOk,
  sendError,
  sendInternalError
};
