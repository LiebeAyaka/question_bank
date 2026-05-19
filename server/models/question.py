from pydantic import BaseModel
from typing import Optional, List
import json


class QuestionBase(BaseModel):
    id: str
    type: str
    content: str
    title: Optional[str] = None
    sub_type: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    questions: Optional[List[dict]] = None
    blanks: Optional[List[dict]] = None
    exam_points: Optional[List[str]] = None
    difficulty: Optional[str] = None
    unit: Optional[str] = None
    created_at: str


class QuestionCreate(BaseModel):
    type: str
    content: str
    title: Optional[str] = None
    sub_type: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    questions: Optional[List[dict]] = None
    blanks: Optional[List[dict]] = None
    exam_points: Optional[List[str]] = None
    difficulty: Optional[str] = None
    unit: Optional[str] = None


class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    title: Optional[str] = None
    sub_type: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    questions: Optional[List[dict]] = None
    blanks: Optional[List[dict]] = None
    exam_points: Optional[List[str]] = None
    difficulty: Optional[str] = None
    unit: Optional[str] = None


def safe_json_loads(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


VALID_TYPES = {'single', 'judge', 'reading', 'cloze', 'fill', 'short_answer', 'essay', 'listening_single', 'listening_group'}

TYPE_ALIASES = {
    'listening': 'listening_group',
    'task_reading': 'reading',
}


def validate_sub_questions(question: dict) -> tuple[bool, str]:
    q_type = question.get('type')
    questions = question.get('questions') or []
    
    if q_type == 'listening_single':
        if len(questions) != 1:
            return False, "听力单选题只能有1道子题目"
    
    if q_type in ('reading', 'listening_group'):
        if len(questions) < 1:
            return False, "至少需要1道子题目"
    
    for idx, sq in enumerate(questions):
        if not sq.get('content'):
            return False, f"第{idx+1}道子题目内容不能为空"
        if not sq.get('answer'):
            return False, f"第{idx+1}道子题目答案不能为空"
    
    return True, ""


def _normalize_items(items, defaults, str_field='content'):
    if not items or not isinstance(items, list):
        return items
    result = []
    for item in items:
        if isinstance(item, dict):
            normalized = dict(defaults)
            normalized.update(item)
            result.append(normalized)
        elif isinstance(item, str):
            normalized = dict(defaults)
            normalized[str_field] = item
            result.append(normalized)
        else:
            result.append(dict(defaults))
    return result


def question_from_row(row: dict) -> dict:
    raw_questions = safe_json_loads(row.get('questions'))
    raw_blanks = safe_json_loads(row.get('blanks'))
    raw_options = safe_json_loads(row.get('options'))

    normalized_questions = _normalize_items(raw_questions, {'content': '', 'answer': ''}, str_field='content')
    normalized_blanks = _normalize_items(raw_blanks, {'answer': ''}, str_field='answer')

    if raw_options and isinstance(raw_options, list):
        normalized_options = [str(o) if o is not None else '' for o in raw_options]
    else:
        normalized_options = raw_options

    q_type = row['type']
    q_type = TYPE_ALIASES.get(q_type, q_type)

    question = QuestionBase(
        id=row['id'],
        type=q_type,
        content=row['content'],
        title=row.get('title'),
        sub_type=row.get('sub_type'),
        options=normalized_options,
        answer=row.get('answer'),
        questions=normalized_questions,
        blanks=normalized_blanks,
        exam_points=safe_json_loads(row.get('exam_points')),
        difficulty=row.get('difficulty'),
        unit=row.get('unit'),
        created_at=row['created_at']
    )
    result = question.model_dump()
    
    if result.get('questions'):
        for sq in result['questions']:
            sq.setdefault('content', '')
            sq.setdefault('options', None)
            sq.setdefault('answer', '')
    if result.get('blanks'):
        for b in result['blanks']:
            b.setdefault('answer', '')
    
    return result


def question_create_to_row(question: QuestionCreate) -> dict:
    return {
        'type': question.type,
        'content': question.content,
        'title': question.title,
        'sub_type': question.sub_type,
        'options': json.dumps(question.options) if question.options is not None else None,
        'answer': question.answer,
        'questions': json.dumps(question.questions) if question.questions is not None else None,
        'blanks': json.dumps(question.blanks) if question.blanks is not None else None,
        'exam_points': json.dumps(question.exam_points) if question.exam_points is not None else None,
        'difficulty': question.difficulty,
        'unit': question.unit,
    }


def question_to_row(question) -> dict:
    return {
        'id': getattr(question, 'id', None),
        'type': question.type,
        'content': question.content,
        'title': getattr(question, 'title', None),
        'sub_type': getattr(question, 'sub_type', None),
        'options': json.dumps(question.options) if getattr(question, 'options', None) is not None else None,
        'answer': getattr(question, 'answer', None),
        'questions': json.dumps(question.questions) if getattr(question, 'questions', None) is not None else None,
        'blanks': json.dumps(question.blanks) if getattr(question, 'blanks', None) is not None else None,
        'exam_points': json.dumps(question.exam_points) if getattr(question, 'exam_points', None) is not None else None,
        'difficulty': getattr(question, 'difficulty', None),
        'unit': getattr(question, 'unit', None),
        'created_at': getattr(question, 'created_at', None)
    }