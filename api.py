"""
IPL Match Prediction API
Helper functions for creating features and making predictions
"""
import joblib
import pandas as pd
import numpy as np

# Load models and data
MODEL = joblib.load('ipl_model/model.pkl')
LIVE_MODEL = joblib.load('ipl_model/live_model.pkl')
PREPROCESSOR = joblib.load('ipl_model/preprocessor.pkl')
HISTORY = joblib.load('ipl_model/history.pkl')

# Load real accuracy from saved info (or calculate if not available)
try:
    ACCURACY_INFO = joblib.load('ipl_model/accuracy_info.pkl')
    PREMATCH_ACCURACY = ACCURACY_INFO.get('prematch_accuracy', 59.13)
    LIVE_ACCURACY = ACCURACY_INFO.get('live_accuracy', 75.0)
except:
    # Fallback to defaults if file doesn't exist
    PREMATCH_ACCURACY = 59.13
    LIVE_ACCURACY = 75.0

# Team name normalization (map old/variations to 10 active IPL teams)
TEAM_NAME_MAP = {
    # Map old names to current active teams
    'Delhi Daredevils': 'Delhi Capitals',
    'Kings XI Punjab': 'Punjab Kings',
    'Royal Challengers Bangalore': 'Royal Challengers Bengaluru',
}

# Active IPL teams (10 current teams)
ACTIVE_TEAMS = {
    'Mumbai Indians',
    'Chennai Super Kings',
    'Royal Challengers Bengaluru',
    'Kolkata Knight Riders',
    'Delhi Capitals',
    'Punjab Kings',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Gujarat Titans',
    'Lucknow Super Giants'
}

# Defunct teams to exclude
DEFUNCT_TEAMS = {
    'Deccan Chargers',
    'Rising Pune Supergiants',
    'Rising Pune Supergiant',
    'Pune Warriors',
    'Gujarat Lions',
    'Kochi Tuskers Kerala'
}

# Venue name normalization (map duplicates/variants to standard names)
VENUE_NAME_MAP = {
    'Feroz Shah Kotla': 'Arun Jaitley Stadium',
    'Punjab Cricket Association IS Bindra Stadium': 'Punjab Cricket Association Stadium',
    'M.Chinnaswamy Stadium': 'M. Chinnaswamy Stadium',
    'M Chinnaswamy Stadium': 'M. Chinnaswamy Stadium',
    'Chepauk Stadium': 'MA Chidambaram Stadium',
    'MA Chidambaram Stadium, Chepauk': 'MA Chidambaram Stadium',
}


def normalize_team_name(name):
    """Normalize team name to standard form (or None if defunct)"""
    # First apply name mapping
    normalized = TEAM_NAME_MAP.get(name, name)
    # Return None if team is defunct
    if normalized in DEFUNCT_TEAMS:
        return None
    return normalized


def normalize_venue_name(name):
    """Normalize venue name to standard form"""
    return VENUE_NAME_MAP.get(name, name)


# Get unique values for dropdowns (after normalization)
raw_teams = sorted(HISTORY['team1'].unique().tolist())
TEAMS = sorted(set(t for t in (normalize_team_name(name) for name in raw_teams) if t is not None))

raw_venues = sorted(HISTORY['venue'].unique().tolist())
VENUES = sorted(set(normalize_venue_name(v) for v in raw_venues))

# Venue to city mapping (using cleaned stadium names)
VENUE_CITY_MAP = {
    'Arun Jaitley Stadium': 'Delhi',
    'Barabati Stadium': 'Cuttack',
    'Barsapara Cricket Stadium': 'Guwahati',
    'Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium': 'Lucknow',
    'Brabourne Stadium': 'Mumbai',
    'Dubai International Cricket Stadium': 'Dubai',
    'DY Patil Stadium': 'Navi Mumbai',
    'Eden Gardens': 'Kolkata',
    'Green Park': 'Kanpur',
    'Himachal Pradesh Cricket Association Stadium': 'Dharamsala',
    'Holkar Cricket Stadium': 'Indore',
    'JSCA International Stadium Complex': 'Ranchi',
    'M. Chinnaswamy Stadium': 'Bengaluru',
    'MA Chidambaram Stadium': 'Chennai',
    'Narendra Modi Stadium': 'Ahmedabad',
    'Nehru Stadium': 'Kochi',
    'Punjab Cricket Association Stadium': 'Chandigarh',
    'Rajiv Gandhi International Stadium': 'Hyderabad',
    'Saurashtra Cricket Association Stadium': 'Rajkot',
    'Sawai Mansingh Stadium': 'Jaipur',
    'Shaheed Veer Narayan Singh International Stadium': 'Raipur',
    'Sharjah Cricket Stadium': 'Sharjah',
    'Sheikh Zayed Stadium': 'Abu Dhabi',
    'Wankhede Stadium': 'Mumbai',
}


def get_city_for_venue(venue):
    """Get city for a given venue"""
    return VENUE_CITY_MAP.get(venue, 'Unknown')


def create_prematch_features(team1, team2, toss_winner, toss_decision, venue, city):
    """
    Create pre-match features for prediction
    """
    # Normalize team names and venue
    team1 = normalize_team_name(team1)
    team2 = normalize_team_name(team2)
    toss_winner = normalize_team_name(toss_winner)
    venue = normalize_venue_name(venue)

    season = HISTORY["season"].max()
    match_history = HISTORY[HISTORY["season"] <= season]

    team1_is_toss = int(toss_winner == team1)
    toss_bat = int(toss_decision == "bat")

    # Head-to-head
    h2h = match_history[
        ((match_history["team1"] == team1) & (match_history["team2"] == team2)) |
        ((match_history["team1"] == team2) & (match_history["team2"] == team1))
    ]
    h2h_wr = (h2h["match_won_by"] == team1).mean() if len(h2h) > 0 else 0.5

    # Form
    def get_form(team):
        m = match_history[
            (match_history["team1"] == team) | (match_history["team2"] == team)
        ].tail(5)
        return (m["match_won_by"] == team).mean() if len(m) > 0 else 0.5

    form1 = get_form(team1)
    form2 = get_form(team2)

    # Venue
    venue_data = match_history[match_history["venue"] == venue]

    def venue_wr(team):
        m = venue_data[
            (venue_data["team1"] == team) | (venue_data["team2"] == team)
        ]
        return (m["match_won_by"] == team).mean() if len(m) > 0 else 0.5

    v1 = venue_wr(team1)
    v2 = venue_wr(team2)

    # Create feature DataFrame
    data = pd.DataFrame([{
        "team1": team1,
        "team2": team2,
        "venue": venue,
        "city": city,
        "toss_decision": toss_decision,
        "team1_is_toss_winner": team1_is_toss,
        "toss_decision_bat": toss_bat,
        "h2h_win_rate_team1": h2h_wr,
        "h2h_total_matches": len(h2h),
        "form_team1_last5": form1,
        "form_team2_last5": form2,
        "form_diff": form1 - form2,
        "venue_wr_team1": v1,
        "venue_wr_team2": v2,
        "match_month": 4,
        "match_day_of_week": 5,
        "season": season
    }])

    return data


def predict_prematch(team1, team2, toss_winner, toss_decision, venue, city):
    """
    Make pre-match prediction using model.pkl
    """
    try:
        # Normalize inputs
        team1 = normalize_team_name(team1)
        team2 = normalize_team_name(team2)
        toss_winner = normalize_team_name(toss_winner)
        venue = normalize_venue_name(venue)
        city = get_city_for_venue(venue)

        features = create_prematch_features(team1, team2, toss_winner, toss_decision, venue, city)
        X = PREPROCESSOR.transform(features)
        pred = MODEL.predict(X)[0]
        prob = MODEL.predict_proba(X)[0]

        winner = team1 if pred == 1 else team2
        team1_prob = round(prob[1] * 100, 2)
        team2_prob = round(prob[0] * 100, 2)

        return {
            "winner": winner,
            "team1_prob": team1_prob,
            "team2_prob": team2_prob,
            "model_accuracy": PREMATCH_ACCURACY
        }
    except Exception as e:
        return {
            "error": f"Pre-match prediction failed: {str(e)}",
            "winner": "Error",
            "team1_prob": 0,
            "team2_prob": 0,
            "model_accuracy": 0
        }


def predict_live(team1, team2, runs_scored, balls_bowled, wickets_fallen, target):
    """
    Make live prediction using live_model.pkl
    """
    # Normalize team names
    team1 = normalize_team_name(team1)
    team2 = normalize_team_name(team2)

    # Calculate features as expected by the live model
    runs_left = target - runs_scored
    balls_left = 120 - balls_bowled  # 20 overs = 120 balls
    cum_runs = runs_scored

    # Create feature DataFrame for live model with correct feature names
    data = pd.DataFrame([{
        'runs_left': runs_left,
        'balls_left': balls_left,
        'cum_runs': cum_runs
    }])

    # Make prediction
    pred = LIVE_MODEL.predict(data)[0]
    prob = LIVE_MODEL.predict_proba(data)[0] if hasattr(LIVE_MODEL, 'predict_proba') else [0.5, 0.5]

    # Determine chasing vs defending
    # pred=1 means chasing team wins, pred=0 means defending team wins
    chasing_win_prob = round(prob[1] * 100, 2) if len(prob) > 1 else 50.0
    defending_win_prob = round(prob[0] * 100, 2) if len(prob) > 0 else 50.0

    return {
        "chasing_team_win_prob": chasing_win_prob,
        "defending_team_win_prob": defending_win_prob,
        "status_snapshot": f"{runs_scored}/{wickets_fallen} in {balls_bowled} balls, Target: {target}",
        "model_accuracy": LIVE_ACCURACY
    }
