import sqlite3
import uuid
import json
import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from models.question import QuestionCreate, QuestionUpdate, question_from_row, question_create_to_row

bp = Blueprint('questions', __name__, url_prefix='/api/questions')

logger = logging.getLogger(__name__)


def get_db():
    DATABASE = current_app.config['DATABASE']
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    return dict(row)


@bp.route('', methods=['GET'])
def get_questions():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        question_type = request.args.get('type')
        search = request.args.get('search')
        difficulty = request.args.get('difficulty')
        units = request.args.get('units')
        exam_points = request.args.get('exam_points')

        query = 'SELECT * FROM questions'
        params = []
        conditions = []

        if question_type:
            conditions.append('type = ?')
            params.append(question_type)

        if difficulty:
            conditions.append('difficulty = ?')
            params.append(difficulty)

        if units:
            unit_list = units.split(',')
            placeholders = ','.join(['?' for _ in unit_list])
            conditions.append(f'unit IN ({placeholders})')
            params.extend(unit_list)

        if exam_points:
            conditions.append('exam_points LIKE ?')
            params.append(f'%{exam_points}%')

        if search:
            conditions.append('(content LIKE ? OR title LIKE ? OR exam_points LIKE ? OR difficulty LIKE ? OR unit LIKE ?)')
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)

        query += ' ORDER BY created_at DESC'

        cursor.execute(query, params)
        rows = cursor.fetchall()

        questions = [question_from_row(row_to_dict(row)) for row in rows]
        return jsonify({'questions': questions, 'total': len(questions)})
    except Exception as e:
        logger.error(f'GET /api/questions error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
    finally:
        if conn:
            conn.close()


@bp.route('', methods=['POST'])
def create_question():
    conn = None
    try:
        data = request.get_json()

        if not data or 'type' not in data:
            return jsonify({'error': 'type is required'}), 400
        if not data.get('content', '').strip():
            return jsonify({'error': 'content is required'}), 400

        now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        question_id = str(uuid.uuid4())
        question = QuestionCreate(
            type=data['type'],
            content=data.get('content', ''),
            title=data.get('title'),
            sub_type=data.get('sub_type'),
            options=data.get('options'),
            answer=data.get('answer'),
            questions=data.get('questions'),
            blanks=data.get('blanks'),
            exam_points=data.get('exam_points'),
            difficulty=data.get('difficulty'),
            unit=data.get('unit')
        )

        conn = get_db()
        cursor = conn.cursor()

        row = question_create_to_row(question)
        cursor.execute('''
            INSERT INTO questions (id, type, content, title, sub_type, options, answer, questions, blanks, exam_points, difficulty, unit, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (question_id, row['type'], row['content'], row['title'], row['sub_type'],
              row['options'], row['answer'], row['questions'], row['blanks'], row['exam_points'], row['difficulty'], row['unit'], now))

        conn.commit()
        return jsonify({'id': question_id, 'message': '题目创建成功'}), 201
    except Exception as e:
        logger.error(f'POST /api/questions error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
    finally:
        if conn:
            conn.close()


@bp.route('/<question_id>', methods=['GET'])
def get_question(question_id):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': '题目不存在'}), 404

        return jsonify(question_from_row(row_to_dict(row)))
    except Exception as e:
        logger.error(f'GET /api/questions/{question_id} error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
    finally:
        if conn:
            conn.close()


@bp.route('/<question_id>', methods=['PUT'])
def update_question(question_id):
    conn = None
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': '请求体不能为空'}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': '题目不存在'}), 404

        # 构建更新字段列表
        updates = []
        params = []
        now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        updates.append('updated_at = ?')
        params.append(now)

        for field in ['type', 'content', 'title', 'sub_type', 'answer', 'difficulty', 'unit']:
            if field in data:
                updates.append(f'{field} = ?')
                params.append(data[field])

        # 处理需要 JSON 序列化的字段
        for field in ['options', 'questions', 'blanks', 'exam_points']:
            if field in data:
                value = data[field]
                updates.append(f'{field} = ?')
                if value is not None:
                    params.append(json.dumps(value))
                else:
                    params.append(None)

        if not updates or len(updates) == 1:  # 只有 updated_at
            return jsonify({'message': '没有需要更新的字段'})

        params.append(question_id)
        query = 'UPDATE questions SET ' + ', '.join(updates) + ' WHERE id = ?'
        cursor.execute(query, params)

        conn.commit()
        return jsonify({'message': '题目更新成功'})
    except Exception as e:
        logger.error(f'PUT /api/questions/{question_id} error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
    finally:
        if conn:
            conn.close()


@bp.route('/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': '题目不存在'}), 404

        cursor.execute('DELETE FROM questions WHERE id = ?', (question_id,))
        conn.commit()
        return jsonify({'message': '题目删除成功'})
    except Exception as e:
        logger.error(f'DELETE /api/questions/{question_id} error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
    finally:
        if conn:
            conn.close()