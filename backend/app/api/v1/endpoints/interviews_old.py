from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.interview import InterviewSession, InterviewQuestion, InterviewAnswer
from app.services.llm import generate_questions, generate_ideal_answer
from app.services.scoring import hybrid_score
from app import schemas

router = APIRouter()

def pregenerate_ideal_answers(session_id: int):
    db: Session = SessionLocal()
    try:
        questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == session_id).all()
        session_rec = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session_rec:
            return
        for q in questions:
            llm_resp = generate_ideal_answer(session_rec.job_title, q.question_type, q.question_text)
            ideal = llm_resp.get("ideal_answer", "")
            feedback = llm_resp.get("feedback", "")
            
            answer_record = InterviewAnswer(
                question_id=q.id,
                ideal_answer=ideal,
                llm_feedback=feedback
            )
            db.add(answer_record)
        db.commit()
    except Exception as e:
        print(f"Error in background task: {e}")
    finally:
        db.close()

from typing import List

@router.get("/", response_model=List[schemas.InterviewSessionResponse])
def get_user_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).order_by(InterviewSession.created_at.desc()).all()
    return sessions

@router.post("/new", response_model=schemas.InterviewSessionResponse)
def create_interview_session(
    data: schemas.InterviewSessionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    
    questions_list = generate_questions(session.job_title, session.job_description)
    if not questions_list:
        raise HTTPException(status_code=500, detail="Failed to generate questions")
        
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
    
    background_tasks.add_task(pregenerate_ideal_answers, session.id)
    
    return session

from typing import Union

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
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    q = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id, InterviewQuestion.interview_id == session_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    ans = db.query(InterviewAnswer).filter(InterviewAnswer.question_id == question_id).first()
    if not ans or not ans.ideal_answer:
        # Fallback if background task hasn't finished
        llm_resp = generate_ideal_answer(session.job_title, q.question_type, q.question_text)
        ideal = llm_resp.get("ideal_answer", "")
        feedback = llm_resp.get("feedback", "")
        if not ans:
            ans = InterviewAnswer(question_id=q.id)
            db.add(ans)
        ans.ideal_answer = ideal
        ans.llm_feedback = feedback
        
    ans.user_answer = data.user_answer
    
    score_data = hybrid_score(
        ans.ideal_answer,
        ans.user_answer,
        session.job_description,
        q.question_text,
        q.question_type
    )
    ans.final_score = score_data['final_score']
    ans.score_breakdown = score_data
    
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
            results.append({
                "question": q,
                "answer": ans
            })
            if ans.final_score:
                total_score += float(ans.final_score)
                answered_count += 1
                
    avg_score = round(total_score / max(answered_count, 1), 1)
    return {
        "session": session,
        "average_score": avg_score,
        "results": results
    }
