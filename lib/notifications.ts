import type { Consultation } from '@prisma/client';

export function buildNotificationPayload(consultation: Consultation, matchScore: number) {
  const urgency = consultation.urgency === 'urgent' ? 'urgent' : 'normal';
  return {
    title: `${consultation.originalTitle} - ${matchScore}% match`,
    body: `Deadline ${consultation.deadline.toISOString()} for ${consultation.organization}.`,
    urgency,
    consultationId: consultation.id
  };
}