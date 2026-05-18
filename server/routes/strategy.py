from flask import Blueprint, request, jsonify
from models.strategy import StrategyModel

strategy_bp = Blueprint('strategy', __name__, url_prefix='/api/strategy')

@strategy_bp.route('', methods=['GET'])
def get_strategies():
    strategies = StrategyModel.get_all()
    for s in strategies:
        if s and 'unit_ratios' in s and s['unit_ratios']:
            import json
            s['unit_ratios'] = json.loads(s['unit_ratios'])
    return jsonify({'strategies': strategies})

@strategy_bp.route('', methods=['POST'])
def create_strategy():
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': '策略名称不能为空'}), 400
    
    difficulty_easy = data.get('difficulty_easy', 30)
    difficulty_medium = data.get('difficulty_medium', 50)
    difficulty_hard = data.get('difficulty_hard', 20)
    unit_ratios = data.get('unit_ratios', {})
    
    strategy = StrategyModel.create(
        name=data['name'],
        difficulty_easy=difficulty_easy,
        difficulty_medium=difficulty_medium,
        difficulty_hard=difficulty_hard,
        unit_ratios=unit_ratios
    )
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy, 'message': '策略创建成功'}), 201

@strategy_bp.route('/<strategy_id>', methods=['GET'])
def get_strategy(strategy_id):
    strategy = StrategyModel.get_by_id(strategy_id)
    if not strategy:
        return jsonify({'error': '策略不存在'}), 404
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy})

@strategy_bp.route('/<strategy_id>', methods=['PUT'])
def update_strategy(strategy_id):
    data = request.get_json()
    
    strategy = StrategyModel.get_by_id(strategy_id)
    if not strategy:
        return jsonify({'error': '策略不存在'}), 404
    
    strategy = StrategyModel.update(
        strategy_id=strategy_id,
        name=data.get('name', strategy['name']),
        difficulty_easy=data.get('difficulty_easy', strategy['difficulty_easy']),
        difficulty_medium=data.get('difficulty_medium', strategy['difficulty_medium']),
        difficulty_hard=data.get('difficulty_hard', strategy['difficulty_hard']),
        unit_ratios=data.get('unit_ratios', json.loads(strategy['unit_ratios']) if strategy.get('unit_ratios') else {})
    )
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy, 'message': '策略更新成功'})

@strategy_bp.route('/<strategy_id>', methods=['DELETE'])
def delete_strategy(strategy_id):
    success = StrategyModel.delete(strategy_id)
    if not success:
        return jsonify({'error': '策略不存在'}), 404
    
    return jsonify({'message': '策略删除成功'})