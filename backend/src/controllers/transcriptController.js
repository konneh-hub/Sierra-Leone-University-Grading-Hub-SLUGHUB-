const transcriptService = require('../services/transcriptService');
const auditService = require('../services/auditService');

exports.generateTranscript = async (req, res, next) => {
  try {
    const transcript = await transcriptService.generateTranscript({
      creator: req.user,
      student_id: req.body.student_id,
      transcript_request_id: req.body.transcript_request_id,
    });

    await auditService.logActivity({
      user_id: req.user.id,
      university_id: transcript.university_id,
      activity_type: 'generate_transcript',
      activity_details: { transcript_id: transcript.id, student_id: transcript.student_id },
    });

    res.status(201).json({ transcript });
  } catch (error) {
    next(error);
  }
};

exports.fetchAcademicHistory = async (req, res, next) => {
  try {
    const history = await transcriptService.fetchAcademicHistory(req.params.studentId);
    res.json({ history });
  } catch (error) {
    next(error);
  }
};

exports.computeFinalCGPA = async (req, res, next) => {
  try {
    const cgpa = await transcriptService.computeFinalCGPA(req.params.studentId);
    res.json({ cgpa });
  } catch (error) {
    next(error);
  }
};
