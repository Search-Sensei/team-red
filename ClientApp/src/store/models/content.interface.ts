export interface Content {
    id: string,
    content: string,
    title: string;
    summary_50: string;
    summary_100: string;
    summary_50_score: string;
    summary_100_score: string;
    keywords: string[];   
    source_doc_url: string;
    category: string;
    created: string;
    modified: string;
    questions_answers?: QuestionAnswer[];
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  ground_truth?: string;
  faithfulness: number;
  answer_relevancy: number;
  harmfulness: number;
  keyword_ranking: number;
  semantic_ranking?: number;
  hybrid_ranking?: number;
  hybrid_semantic_ranking?: number;
  context_precision?: number | null;
  context_recall?: number | null;
  answer_correctness?: number | null;
  qa_status? : boolean | null;
}

export interface IContentState {
    contentList: Content[],
    contentEdit: Content,
    contentCount: number,
    isLoading: boolean,
    isUpdating: boolean,
    error: any,
}

