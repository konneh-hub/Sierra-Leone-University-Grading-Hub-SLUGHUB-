const resultService = require('../services/resultService');
const auditService = require('../services/auditService');

exports.listResults = async (req, res, next) => {
  try {
    const results = await resultService.listResults(req.user);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};

exports.createResult = async (req, res, next) => {
  try {
    const result = await resultService.createDraftResult(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'create_result_draft',
      activity_details: { result_id: result.id },
    });
    res.status(201).json({ result });
  } catch (error) {
    next(error);
  }
};

exports.updateResult = async (req, res, next) => {
  try {
    const result = await resultService.uploadResultScores({ result_id: req.params.id, ...req.body });
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'update_result_scores',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.getResultsForStudent = async (req, res, next) => {
  try {
    const results = await resultService.getResultsForStudent(req.params.studentId, req.user);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const result = await resultService.submitResultToHOD(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'submit_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const result = await resultService.verifyResultByHOD(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'verify_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.review = async (req, res, next) => {
  try {
    const result = await resultService.reviewResultByDean(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'review_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const result = await resultService.approveResultByExamOfficer(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'approve_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.publish = async (req, res, next) => {
  try {
    const result = await resultService.publishResult(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'publish_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await resultService.rejectResult(req.params.resultId, reason, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'reject_result',
      activity_details: { result_id: result.id, reason },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

exports.resubmit = async (req, res, next) => {
  try {
    const result = await resultService.resubmitResult(req.params.resultId, req.user);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'resubmit_result',
      activity_details: { result_id: result.id },
    });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};
