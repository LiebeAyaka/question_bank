import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from routes.questions import bp as questions_bp
from routes.strategy import strategy_bp
from migrations import run_migrations
import json
import shutil
from datetime import datetime, timezone

app = Flask(__name__)
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:10289')
CORS(app,
    resources={r"/api/*": {
        "origins": cors_origins,
        "supports_credentials": True
    }},
    expose_headers=["Content-Range", "X-Total-Count"]
)

# 统一数据库路径配置
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'database.db')
app.config['EXAMPLE_DATABASE'] = os.path.join(os.path.dirname(__file__), 'example.db')

app.register_blueprint(questions_bp)
app.register_blueprint(strategy_bp)


@app.route('/api/status')
def get_status():
    """获取数据库状态"""
    import sqlite3
    DATABASE = app.config['DATABASE']
    conn = sqlite3.connect(DATABASE)
    
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM questions')
        count = cursor.fetchone()[0]
        return jsonify({
            'has_data': count > 0,
            'question_count': count
        })
    except Exception:
        return jsonify({
            'has_data': False,
            'question_count': 0
        })
    finally:
        conn.close()


@app.route('/api/seed', methods=['POST'])
def seed_from_example():
    """从 example.db 导入示例数据"""
    import sqlite3
    
    DATABASE = app.config['DATABASE']
    EXAMPLE_DB = app.config['EXAMPLE_DATABASE']
    
    if not os.path.exists(EXAMPLE_DB):
        return jsonify({'error': '示例数据库不存在'}), 404
    
    # 备份当前数据库
    if os.path.exists(DATABASE):
        backup_path = DATABASE + '.backup'
        shutil.copy2(DATABASE, backup_path)
    
    # 复制 example.db 到 database.db
    shutil.copy2(EXAMPLE_DB, DATABASE)
    
    # 重置迁移记录，让 run_migrations 重新执行所有迁移
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM schema_migrations')
        conn.commit()
        conn.close()
    except Exception:
        # 如果重置失败，忽略（可能是 example.db 没有 schema_migrations 表）
        pass
    
    # 重新执行迁移确保 schema 正确
    run_migrations(DATABASE)
    
    # 获取导入的题目数量
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM questions')
    count = cursor.fetchone()[0]
    conn.close()
    
    return jsonify({
        'message': '示例数据导入成功',
        'question_count': count
    })


@app.route('/')
def index():
    return jsonify({'message': '题库 API 服务', 'version': '1.0.0'})


@app.route('/api')
def api_info():
    return jsonify({
        'message': '题库 API',
        'endpoints': {
            'GET /api/questions': '获取题目列表（支持 type, search 参数）',
            'POST /api/questions': '创建题目',
            'GET /api/questions/<id>': '获取单个题目',
            'PUT /api/questions/<id>': '更新题目',
            'DELETE /api/questions/<id>': '删除题目'
        }
    })


def seed_sample_data():
    import sqlite3
    import uuid

    # 只在开发环境自动播种
    if os.environ.get('FLASK_ENV') == 'production':
        return

    DATABASE = app.config['DATABASE']
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM questions')
    count = cursor.fetchone()[0]

    if count > 0:
        conn.close()
        return

    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    sample_questions = [
        {
            'id': str(uuid.uuid4()),
            'type': 'single',
            'content': '西班牙语中，"谢谢"怎么说？',
            'options': json.dumps(['Hola', 'Gracias', 'Adios', 'Por favor']),
            'answer': 'B',
            'exam_points': json.dumps(['基础词汇', '日常用语']),
            'difficulty': 'easy',
            'unit': 'Unit 1',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'judge',
            'content': '西班牙语中所有名词都有阴性和阳性之分。',
            'answer': 'T',
            'exam_points': json.dumps(['语法', '名词']),
            'difficulty': 'medium',
            'unit': 'Unit 2',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'reading',
            'title': 'Introducción al Español',
            'content': 'El español es uno de los idiomas más hablados del mundo. Pertenece a la familia de lenguas romances y es el idioma oficial de España y la mayoría de los países de América Latina. El español tiene 27 letras en su alfabeto, incluyendo 5 vocales (a, e, i, o, u).',
            'sub_type': 'single',
            'questions': json.dumps([
                {'content': '¿A qué familia de idiomas pertenece el español?', 'options': ['Germánica', 'Romance', 'Eslava', 'Céltica'], 'answer': 'B'},
                {'content': '¿Cuántas vocales tiene el alfabeto español?', 'options': ['Cuatro', 'Cinco', 'Seis', 'Siete'], 'answer': 'B'},
                {'content': '¿Qué característica tiene la pronunciación del español?', 'options': ['Muy irregular', 'Relativamente regular', 'Completamente irregular', 'Solo existe en forma escrita'], 'answer': 'B'}
            ]),
            'exam_points': json.dumps(['阅读理解', '语言概述']),
            'difficulty': 'medium',
            'unit': 'Unit 3',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'cloze',
            'content': 'María ___1___ en Madrid. Todos los días ___2___ al parque con su perro. Le gusta mucho ___3___ español con sus amigos.',
            'questions': json.dumps([
                {'content': '空1', 'options': ['vive', 'come', 'duerme', 'corre'], 'answer': 'A'},
                {'content': '空2', 'options': ['va', 'ven', 'van', 'vas'], 'answer': 'A'},
                {'content': '空3', 'options': ['hablar', 'comer', 'dormir', 'correr'], 'answer': 'A'}
            ]),
            'exam_points': json.dumps(['完形填空', '动词变位']),
            'difficulty': 'hard',
            'unit': 'Unit 4',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'task_reading',
            'title': 'La Cultura Española',
            'content': 'España es un país rico en cultura y tradiciones. La fiesta más conocida es la Feria de Abril en Sevilla, donde la gente baila flamenco y viste trajes tradicionales.',
            'questions': json.dumps([
                {'content': '西班牙最著名的节日是什么？在哪个城市举行？', 'answer': '四月节（Feria de Abril），在塞维利亚（Sevilla）举行'},
                {'content': '列举三种典型的西班牙美食。', 'answer': '瓦伦西亚海鲜饭（paella）、安达卢西亚冷汤（gazpacho）、土豆饼（tortilla de patatas）'}
            ]),
            'exam_points': json.dumps(['任务型阅读', '西班牙文化']),
            'difficulty': 'medium',
            'unit': 'Unit 5',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'fill',
            'content': '西班牙语中，"你好"是___1___，"再见"是___2___，"请"是___3___。',
            'blanks': json.dumps([
                {'content': '', 'answer': 'Hola'},
                {'content': '', 'answer': 'Adiós'},
                {'content': '', 'answer': 'Por favor'}
            ]),
            'exam_points': json.dumps(['填空题', '基础词汇']),
            'difficulty': 'easy',
            'unit': 'Unit 1',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'short_answer',
            'content': '请简述西班牙语中ser和estar两个动词的主要区别，并各举一个例子。',
            'answer': 'ser表示本质、身份、特征等永久性状态，如Soy estudiante（我是学生）；estar表示位置、状态等暂时性情况，如Estoy cansado（我累了）。',
            'exam_points': json.dumps(['问答题', '动词用法']),
            'difficulty': 'hard',
            'unit': 'Unit 6',
            'created_at': now
        },
        {
            'id': str(uuid.uuid4()),
            'type': 'essay',
            'content': '请用西班牙语写一篇不少于100字的短文，介绍你的一天（Mi día）。要求使用一般现在时，包含至少5个不同的动词变位。',
            'answer': '评分标准：动词变位正确使用（40%）、语法准确性（20%）、词汇丰富度（20%）、内容连贯性（20%）',
            'exam_points': json.dumps(['作文题', '写作']),
            'difficulty': 'hard',
            'unit': 'Unit 7',
            'created_at': now
        }
    ]

    for q in sample_questions:
        cursor.execute('''
            INSERT INTO questions (id, type, content, title, sub_type, options, answer, questions, blanks, exam_points, difficulty, unit, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (q['id'], q['type'], q['content'], q.get('title'), q.get('sub_type'),
              q.get('options'), q.get('answer'), q.get('questions'), q.get('blanks'),
              q.get('exam_points'), q.get('difficulty'), q.get('unit'), q['created_at']))

    conn.commit()
    conn.close()
    print(f'已插入 {len(sample_questions)} 道示例题目')


if __name__ == '__main__':
    run_migrations(app.config['DATABASE'])
    # 如果 example.db 不存在，使用代码生成示例数据
    if not os.path.exists(app.config['EXAMPLE_DATABASE']):
        seed_sample_data()
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=10288, debug=debug)