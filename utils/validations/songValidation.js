const Joi = require("joi");

const songSchema = Joi.object({
  customMode: Joi.boolean().required(),
  instrumental: Joi.boolean().required(),
  prompt: Joi.string().required(),
  lyrics: Joi.string().allow(""),  // Optional and allows empty string
  style: Joi.string().required().messages({
  'any.required': 'Tags is required and cannot be empty.',
  'string.empty': 'Tags cannot be empty.',
}),
  songType: Joi.string().valid("full song", "clip").required(),
  title: Joi.string().required().max(100),
  
  // New fields
  model: Joi.string(),
  clipStart: Joi.number().integer().min(0),
  lyricsStart: Joi.number().integer().min(0),
  clipLength: Joi.number().integer().min(0),
  promptStrength: Joi.boolean(),
  lyricsStrength: Joi.boolean(),
  clarity: Joi.boolean(),
  negativeTags: Joi.string().allow('').messages({
  'string.empty': 'Style Reduction cannot be empty.',
}),
});

module.exports = { songSchema };