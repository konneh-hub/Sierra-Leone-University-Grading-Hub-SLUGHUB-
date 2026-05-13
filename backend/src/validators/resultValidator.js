exports.validateResultEntry = (req, res, next) => {
  const { studentId, courseId, grade, semester } = req.body;
  if (!studentId || !courseId || !grade || !semester) {
    return res.status(400).json({ error: 'studentId, courseId, grade, and semester are required.' });
  }
  next();
};
