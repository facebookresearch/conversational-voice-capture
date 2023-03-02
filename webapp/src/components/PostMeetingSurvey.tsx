export function surveyUrl(sessionId: string | null) {
  return `https://docs.google.com/forms/`;
}

export default function PostMeetingSurvey({
  sessionId,
}: {
  sessionId: string | null;
}) {
  return (
    <a href={surveyUrl(sessionId)} target="_blank">
      Fill out a quick 2min survey!
    </a>
  );
}
