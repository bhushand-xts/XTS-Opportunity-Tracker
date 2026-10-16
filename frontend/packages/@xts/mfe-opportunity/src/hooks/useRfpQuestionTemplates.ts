import { useQuery } from '@apollo/client';
import type { RfpQuestion } from '@xts/api-contracts';
import { GET_RFP_QUESTION_TEMPLATES } from '../services/rfpQuestion.queries';

interface RfpQuestionTemplatesData {
  rfpQuestionsList: (RfpQuestion | null)[] | null;
}

export function useRfpQuestionTemplates(enabled = true) {
  const { data, loading, error, refetch } = useQuery<RfpQuestionTemplatesData>(GET_RFP_QUESTION_TEMPLATES, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const questions = (data?.rfpQuestionsList ?? [])
    .filter((question): question is RfpQuestion => question?.isActive === true)
    .sort((left, right) => (left.displayOrder ?? Infinity) - (right.displayOrder ?? Infinity) || left.id - right.id);
  const unavailable = enabled && !loading && !error && data && !Array.isArray(data.rfpQuestionsList)
    ? new Error('Question Master returned no question data. Please retry.')
    : undefined;

  return {
    questions,
    loading: enabled && loading,
    error: error ?? unavailable,
    // Apollo exposes failures through error; catching here avoids an unhandled
    // rejection when the user retries an unavailable master-data service.
    retry: () => { void refetch().catch(() => undefined); },
  };
}
