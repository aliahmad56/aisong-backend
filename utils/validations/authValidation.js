const Joi = require("joi");

const authSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
});

module.exports = { authSchema };