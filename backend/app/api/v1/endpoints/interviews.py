from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Union, Dict, Any
from app.db.session import SessionLocal
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.interview import InterviewSession, InterviewQuestion, InterviewAnswer
from app.services.interview_generator import generate_questions_llm, evaluate_answer_llm
from app.services.scoring import score_answer_nlp
from app import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.InterviewSessionResponse])
@router.get("", response_model=List[schemas.InterviewSessionResponse])
def get_user_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).order_by(InterviewSession.created_at.desc()).all()
    return sessions

@router.post("/new", response_model=schemas.InterviewSessionResponse)
def create_interview_session(
    data: schemas.InterviewSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Create session record
    session = InterviewSession(
        user_id=current_user.id,
        job_title=data.job_title,
        job_description=data.job_description,
        status="in_progress",
        round=1
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # 2. Generate questions using LLM
    try:
        # Note: calling async logic synchronously here if generate_questions_llm is synchronous (it uses groq client sync)
        # If generate_questions_llm was async we would await it. The provided code used synchronous client.
        questions_list = generate_questions_llm(session.job_title, session.job_description)
    except Exception as e:
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

    if not questions_list:
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to generate questions (empty result)")
        
    # 3. Save questions
    for q_data in questions_list:
        q = InterviewQuestion(
            interview_id=session.id,
            round=1,
            question_number=q_data.get("number", 1),
            question_type=q_data.get("type", "behavioral"),
            question_text=q_data.get("question", "")
        )
        db.add(q)
    db.commit()
    db.refresh(session)
    
    return session

@router.get("/{session_id}/next", response_model=Union[schemas.InterviewQuestionBase, dict])
def get_next_question(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.interview_id == session_id,
        InterviewQuestion.round == session.round
    ).order_by(InterviewQuestion.question_number).all()
    
    # Find first unanswered question
    for q in questions:
        # Check if answered
        ans = db.query(InterviewAnswer).filter(InterviewAnswer.question_id == q.id, InterviewAnswer.user_answer.isnot(None)).first()
        if not ans:
            return q
            
    # All answered
    session.status = "completed"
    db.commit()
    return {"message": "All questions completed"}

@router.post("/{session_id}/answer/{question_id}", response_model=schemas.InterviewAnswerResponse)
def submit_answer(
    session_id: int,
    question_id: int,
    data: schemas.InterviewAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify question and ownership
    q = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=403, detail="Not authorized to answer this question")
        
    if q.interview_id != session_id:
         raise HTTPException(status_code=400, detail="Question does not belong to this session")

    # 2. Get or create answer record
    ans = db.query(InterviewAnswer).filter(InterviewAnswer.question_id == question_id).first()
    if not ans:
        ans = InterviewAnswer(question_id=q.id)
        db.add(ans)

    # 3. Call LLM to evaluate
    try:
        evaluation = evaluate_answer_llm(
            job_title=session.job_title,
            question_type=q.question_type,
            question=q.question_text,
            user_answer=data.user_answer
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Evaluation failed: {str(e)}")

    ideal_answer = evaluation.get("ideal_answer", "")
    feedback = evaluation.get("feedback", "")
    keywords = evaluation.get("keywords", [])

    # 4. Calculate Score
    score_data = score_answer_nlp(
        user_answer=data.user_answer,
        ideal_answer=ideal_answer,
        keywords=keywords,
        question_type=q.question_type
    )

    # 5. Update record
    ans.user_answer = data.user_answer
    ans.ideal_answer = ideal_answer
    ans.llm_feedback = feedback
    ans.final_score = score_data['final_score']
    ans.score_breakdown = score_data # Stores semantic_score, keyword_score, matched_keywords etc.
    
    db.commit()
    db.refresh(ans)
    
    return ans

@router.get("/{session_id}/results", response_model=dict)
def get_results(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == session_id).all()
    results = []
    total_score = 0
    answered_count = 0
    for q in questions:
        ans = db.query(InterviewAnswer).filter(InterviewAnswer.question_id == q.id, InterviewAnswer.user_answer.isnot(None)).first()
        if ans:
             # Add question details to result
            results.append({
                "question": {
                    "id": q.id,
                    "question_number": q.question_number,
                    "question_text": q.question_text,
                    "type": q.question_type,
                },
                "answer": {
                    "user_answer": ans.user_answer,
                    "ideal_answer": ans.ideal_answer,
                    "llm_feedback": ans.llm_feedback,
                    "final_score": float(ans.final_score) if ans.final_score is not None else 0.0,
                    "score_breakdown": ans.score_breakdown
                }
            })
            if ans.final_score:
                total_score += float(ans.final_score)
                answered_count += 1
                
    avg_score = round(total_score / max(answered_count, 1), 1)
    
    return {
        "session": {
            "id": session.id,
            "job_title": session.job_title,
            "status": session.status,
            "round": session.round,
            "created_at": session.created_at.isoformat() if session.created_at else None,
        },
        "average_score": avg_score,
        "results": results
    }
