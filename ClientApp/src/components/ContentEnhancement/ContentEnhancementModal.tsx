// @ts-nocheck
import "bootstrap/dist/css/bootstrap.css";
import React, { Dispatch, useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import "./Content.css";
import { IStateType } from "../../store/models/root.interface";
import { useDispatch, useSelector } from "react-redux";
import { IContentState, Content, QuestionAnswer } from "../../store/models/content.interface";
import { IAdminSettingsState } from "../../store/models/adminsettingsstate.interface";
import LoadingIndicator from "../../common/components/LoadingIndicator";
import {
    createContent,
    updateContent,
    removeContentUpdate,
    retrieveContent,
} from "../../store/actions/content.action";

interface IMyProps {
    contentModalShow: boolean;
    setContentModalShow: Function;
    title: string;
}

const ContentEnhancementModal: React.FC<IMyProps> = (props: IMyProps) => {
    const dispatch: Dispatch<any> = useDispatch();
    const adminSettingsState: IAdminSettingsState = useSelector(
        (state: IStateType) => state.adminSettingsState
    );
    const contentState: IContentState = useSelector(
        (state: IStateType) => state.contentState
    );

    const [content, setContent] = useState<Content>({
        id: '',
        content: '',
        title: '',
        summary_50: '',
        summary_100: '',
        summary_50_score: '',
        summary_100_score: '',
        keywords: [""],
        questions_answers: [
            {
                question: "",
                answer: "",
                faithfulness: 0,
                answer_relevancy: 0,
                harmfulness: 0,
                keyword_ranking: 0,
                semantic_ranking: 0,
                hybrid_ranking: 0,
                hybrid_semantic_ranking: 0,
                context_precision: null,
                context_recall: null,
                answer_correctness: null,
                ground_truth: '',
            }
        ],
        source_doc_url: '',
        category: '',
        created: '',
        modified: ''
    });
    const contentEdit: any = contentState?.contentEdit;
    const [saveClicked, setSaveClicked] = useState(false);
    const [load, isLoad] = useState(false);
    useEffect(() => {
        if (contentState.contentEdit.id) {
            setContent(contentState.contentEdit);
        }
    }, [contentState.contentEdit]);

    const getAdminApiBaseUrl = useCallback((): string => {
        return normalizeAdminApiUrl(adminSettingsState.adminSettings?.searchAdminApiUrl);
    }, [adminSettingsState.adminSettings]);

    //const handleCreateContent = async (): Promise<void> => {
    //    if (!content.contents || !content.word) {
    //        setSaveClicked(true);
    //        return;
    //    }
    //    else {
    //        if (contentState.contentEdit.id) {
    //            dispatch(updateContent(getAdminApiBaseUrl(), content));
    //        } else {
    //            dispatch(createContent(getAdminApiBaseUrl(), content));
    //            dispatch(retrieveContent(getAdminApiBaseUrl(), { contents: "" }));
    //        }
    //        await props.setContentModalShow(false);
    //        await dispatch(removeContentUpdate());
    //    }
    //};

    const handleSaveAndRegenerate = async (): Promise<void> => {
        setSaveClicked(true)
        isLoad(true)
        const newData = {
            ...contentState.contentList[0],
            questions_answers: contentState.contentList[0].questions_answers?.map((qa) =>
                qa.question === contentEdit.question ? { ...qa, qa_status: false } : {...qa}
            ),
        };
        await dispatch(updateContent(getAdminApiBaseUrl(), newData));
        setSaveClicked(false)
        isLoad(false)
        props.setContentModalShow(false)
    };

    // On successful validation of each step set the wizard queryRule to pass to the next step
    // Set defaults for properties if not passed in.
    return (
        <Modal
            show={props.contentModalShow}
            onHide={() => props.setContentModalShow(false)}
        >
            <Modal.Header closeButton>
                <Modal.Title>{props.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {load? (<LoadingIndicator
                            text={'Loading'}
                            isLoading={load}
                        />) :
                (<table style={{ width: '100%', marginTop: '15px' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '16px' }}>
                                <div style={{ marginLeft: '24px', width: 'calc(100% - 24px)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <strong style={{ minWidth: '200px', marginRight: '16px' }}>Question:</strong>
                                        <input
                                            type="text"
                                            value={contentEdit?.question || ''}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <strong style={{ minWidth: '200px', marginRight: '16px' }}>Answer:</strong>
                                        <input
                                            type="text"
                                            value={contentEdit?.answer || ''}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Faithfulness:</strong> {contentEdit?.faithfulness}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Answer Relevancy:</strong> {contentEdit?.answer_relevancy}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Keyword Ranking:</strong> {contentEdit?.keyword_ranking}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Harmfulness:</strong> {contentEdit?.harmfulness}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Context Precision:</strong> {contentEdit?.context_precision}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Context Recall:</strong> {contentEdit?.context_recall}
                                    </p>
                                    <p style={{ marginLeft: '24px' }}>
                                        <strong>Answer Correctness:</strong> {contentEdit?.answer_correctness}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <strong style={{ minWidth: '200px', marginRight: '16px' }}>Ground Truth:</strong>
                                        <input
                                            type="text"
                                            value={contentEdit?.ground_truth || ''}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>)}
            </Modal.Body>
            <Modal.Footer style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <Button
                        className="btn-modal-content"
                        variant="secondary"
                        style={{ marginRight: '8px' }}
                    // onClick={handleRegenerateMetrics} // Add your handler here
                    >
                        Regenerate Metrics
                    </Button>
                    <Button
                        className="btn-modal-content"
                        variant="danger"
                    // onClick={handleDeleteQAPair} // Add your handler here
                    >
                        Delete Q/A Pair
                    </Button>
                </div>
                <Button
                    className="btn-modal-content"
                    variant="primary"
                    onClick={handleSaveAndRegenerate}
                >
                    Save and Regenerate
                </Button>
            </Modal.Footer>
        </Modal>
    );

};

export default ContentEnhancementModal;
