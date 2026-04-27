import Joi from 'joi';

const generateSchema = Joi.object({
  businessName: Joi.string().trim().min(1).required().messages({
    'string.empty': 'businessName is required',
    'any.required': 'businessName is required',
  }),
  location: Joi.string().trim().optional().allow(''),
  keywords: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one keyword is required',
      'any.required': 'keywords are required',
    }),
  tone: Joi.string().valid('positive', 'neutral', 'mixed').default('positive'),
  reviewCount: Joi.number().integer().min(1).max(10).default(3).messages({
    'number.max': 'reviewCount must be 10 or fewer',
    'number.min': 'reviewCount must be at least 1',
  }),
});

const validateGenerateRequest = (req, res, next) => {
  const { error, value } = generateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join('; '),
    });
  }

  // Replace body with validated + defaulted values
  req.body = value;
  next();
};

export default validateGenerateRequest;
