export const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function lambdaResponse(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export function successResponse(data, statusCode = 200) {
  return lambdaResponse(statusCode, data);
}

export function createdResponse(data) {
  return lambdaResponse(201, data);
}

export function errorResponse(statusCode, message) {
  return lambdaResponse(statusCode, { error: message });
}

export const HTTP = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
});
