import sqlite3
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


def migrate_answers(db_path: str):
    """迁移答案格式：从 ABCD 字母转换为选项文本"""
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT id, type, options, answer, questions FROM questions")
        questions = cursor.fetchall()

        update_count = 0
        for row in questions:
            qid, qtype, options_str, answer, questions_str = row
            needs_update = False
            new_answer = answer
            new_questions = questions_str

            options = json.loads(options_str) if options_str else None
            questions_data = json.loads(questions_str) if questions_str else None

            if qtype == 'single' and answer and options:
                if answer in ['A', 'B', 'C', 'D']:
                    idx = ord(answer) - ord('A')
                    if idx < len(options):
                        new_answer = options[idx]
                        needs_update = True
                        logger.info(f"Single [{qid[:8]}...] '{answer}' -> '{new_answer}'")

            if questions_data:
                for sq in questions_data:
                    if 'answer' in sq and sq['answer'] and 'options' in sq and sq['options']:
                        old_ans = sq['answer']
                        if old_ans in ['A', 'B', 'C', 'D']:
                            idx = ord(old_ans) - ord('A')
                            if idx < len(sq['options']):
                                sq['answer'] = sq['options'][idx]
                                needs_update = True
                                logger.info(f"SubQ [{qid[:8]}...] '{old_ans}' -> '{sq['answer']}'")
                new_questions = json.dumps(questions_data)

            if needs_update:
                cursor.execute(
                    "UPDATE questions SET answer = ?, questions = ? WHERE id = ?",
                    (new_answer, new_questions, qid)
                )
                update_count += 1

        conn.commit()
        logger.info(f"Migration complete: {update_count} questions updated")

    finally:
        conn.close()


if __name__ == '__main__':
    import sys
    import os

    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'example.db')
    if not os.path.exists(db_path):
        logger.error(f"Database not found: {db_path}")
        sys.exit(1)

    migrate_answers(db_path)
