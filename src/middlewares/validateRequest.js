import Joi from "joi";

const reviewSchema = Joi.object({
  businessName: Joi.string().required(),
  review: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  customerName: Joi.string().optional(),
  tone: Joi.string().valid("professional", "friendly", "apologetic").optional(),
});

const validateRequest = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }
  next();
};

export default validateRequest;
