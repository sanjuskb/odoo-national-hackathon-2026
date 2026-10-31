const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;
    const user = await authService.register({ email, password, full_name });
    return successResponse(res, 201, { user }, 'User registered successfully');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const sessionData = await authService.login({ email, password });
    return successResponse(res, 200, sessionData, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword({ email });
    return successResponse(res, 200, null, result.message);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const { id, email, role } = req.user;
    return successResponse(
      res,
      200,
      {
        id,
        email,
        role,
        user: { id, email, role },
      },
      'Current user profile'
    );
  } catch (err) {
    next(err);
  }
}

async function createStaff(req, res, next) {
  try {
    const { email, password, full_name } = req.body;
    const user = await authService.createStaff({ email, password, full_name });
    return successResponse(res, 201, { user }, 'Staff user created successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  me,
  createStaff,
};
