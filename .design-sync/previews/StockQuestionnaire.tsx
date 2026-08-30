/* The registry's Questionnaire. No vendored demo (the chat-family examples need
   the Vercel AI SDK and are excluded from the stock tier), so this is composed
   from the component's own API — as an intake question, which is what a
   gastroenterology practice would actually ask. */

import {
  StockQuestionnaire as Questionnaire,
  StockQuestionnaireActions as QuestionnaireActions,
  StockQuestionnaireChoice as QuestionnaireChoice,
  StockQuestionnaireChoices as QuestionnaireChoices,
  StockQuestionnaireDescription as QuestionnaireDescription,
  StockQuestionnaireItem as QuestionnaireItem,
  StockQuestionnaireNext as QuestionnaireNext,
  StockQuestionnairePrevious as QuestionnairePrevious,
  StockQuestionnaireProgress as QuestionnaireProgress,
  StockQuestionnaireTitle as QuestionnaireTitle,
} from "westchase-gi";

export function IntakeQuestion() {
  return (
    <Questionnaire className="w-full max-w-md">
      <QuestionnaireProgress />
      <QuestionnaireItem>
        <QuestionnaireTitle>Have you had a colonoscopy before?</QuestionnaireTitle>
        <QuestionnaireDescription>
          This helps the office plan the right amount of time for your visit.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="never">No, this would be my first</QuestionnaireChoice>
          <QuestionnaireChoice value="within-5">Yes, within the last 5 years</QuestionnaireChoice>
          <QuestionnaireChoice value="over-5">Yes, more than 5 years ago</QuestionnaireChoice>
          <QuestionnaireChoice value="unsure">I am not sure</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireNext />
        </QuestionnaireActions>
      </QuestionnaireItem>
    </Questionnaire>
  );
}
