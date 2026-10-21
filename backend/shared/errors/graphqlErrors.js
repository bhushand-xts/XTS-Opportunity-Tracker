const { GraphQLError } = require('graphql');
const CODES = require('./errorCodes');

const make = (code) => (message, extra = {}) =>
  new GraphQLError(message, { extensions: { code, ...extra } });

module.exports = {
  notFound: make(CODES.NOT_FOUND),
  validationFailed: make(CODES.VALIDATION_FAILED),
  forbidden: make(CODES.FORBIDDEN),
  unauthenticated: make(CODES.UNAUTHENTICATED),
  conflict: make(CODES.CONFLICT),
};
