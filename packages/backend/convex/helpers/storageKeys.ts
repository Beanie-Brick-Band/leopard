export function getObjectKey(classroomId: string, assignmentId: string) {
  return `starter-codes/${classroomId}/${assignmentId}/starter-code.zip`;
}

export function getSubmissionObjectKey(
  classroomId: string,
  assignmentId: string,
  studentId: string,
) {
  return `submissions/${classroomId}/${assignmentId}/${studentId}/submission.zip`;
}
