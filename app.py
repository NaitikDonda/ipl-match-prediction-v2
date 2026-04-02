"""
IPL Match Prediction Flask Application
"""
from flask import Flask, render_template, request, jsonify
from api import predict_prematch, predict_live, TEAMS, VENUES, get_city_for_venue, PREMATCH_ACCURACY, LIVE_ACCURACY

app = Flask(__name__)


@app.route('/api/stats')
def get_stats():
    """Get real model stats"""
    return jsonify({
        'team_count': len(TEAMS),
        'venue_count': len(VENUES),
        'prematch_accuracy': PREMATCH_ACCURACY,
        'live_accuracy': LIVE_ACCURACY
    })


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/api/teams')
def get_teams():
    """Get list of teams for dropdowns"""
    return jsonify({'teams': TEAMS})


@app.route('/api/venues')
def get_venues():
    """Get list of venues and their cities"""
    venue_data = []
    for venue in VENUES:
        venue_data.append({
            'venue': venue,
            'city': get_city_for_venue(venue)
        })
    return jsonify({'venues': venue_data})


@app.route('/api/city')
def get_city():
    """Get city for a specific venue"""
    venue = request.args.get('venue', '')
    city = get_city_for_venue(venue)
    return jsonify({'city': city})


@app.route('/predict', methods=['POST'])
def predict():
    """
    Pre-match prediction endpoint
    Expected JSON: {team1, team2, toss_winner, toss_decision, venue, city}
    """
    try:
        data = request.get_json()

        team1 = data.get('team1')
        team2 = data.get('team2')
        toss_winner = data.get('toss_winner')
        toss_decision = data.get('toss_decision')
        venue = data.get('venue')
        city = data.get('city')

        result = predict_prematch(team1, team2, toss_winner, toss_decision, venue, city)
        result['model_accuracy'] = PREMATCH_ACCURACY

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict_live', methods=['POST'])
def predict_live_route():
    """
    Live prediction endpoint
    Expected JSON: {team1, team2, runs_scored, balls_bowled, wickets_fallen, target}
    """
    try:
        data = request.get_json()

        team1 = data.get('team1')
        team2 = data.get('team2')
        runs_scored = int(data.get('runs_scored', 0))
        balls_bowled = int(data.get('balls_bowled', 0))
        wickets_fallen = int(data.get('wickets_fallen', 0))
        target = int(data.get('target', 0))

        result = predict_live(team1, team2, runs_scored, balls_bowled, wickets_fallen, target)
        result['model_accuracy'] = LIVE_ACCURACY

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
