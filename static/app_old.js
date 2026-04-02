// IPL Match Predictor - Frontend JavaScript

let allTeams = [];
let allVenues = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTeams();
    loadVenues();
});

// Load teams from API
function loadTeams() {
    fetch('/api/teams')
        .then(response => response.json())
        .then(data => {
            allTeams = data.teams;
            populateTeamDropdowns();
        })
        .catch(error => console.error('Error loading teams:', error));
}

// Load venues from API
function loadVenues() {
    fetch('/api/venues')
        .then(response => response.json())
        .then(data => {
            allVenues = data.venues;
            populateVenueDropdown();
        })
        .catch(error => console.error('Error loading venues:', error));
}

// Populate team dropdowns
function populateTeamDropdowns() {
    const team1Select = document.getElementById('team1');
    const team2Select = document.getElementById('team2');
    const tossSelect = document.getElementById('toss_winner');
    const liveTeam1Select = document.getElementById('live-team1');
    const liveTeam2Select = document.getElementById('live-team2');

    const options = '<option value="">Select Team</option>' +
        allTeams.map(team => `<option value="${team}">${team}</option>`).join('');

    team1Select.innerHTML = '<option value="">Select Team 1</option>' + allTeams.map(team => `<option value="${team}">${team}</option>`).join('');
    team2Select.innerHTML = '<option value="">Select Team 2</option>' + allTeams.map(team => `<option value="${team}">${team}</option>`).join('');
    tossSelect.innerHTML = '<option value="">Select Toss Winner</option>';

    liveTeam1Select.innerHTML = options;
    liveTeam2Select.innerHTML = options;
}

// Populate venue dropdown
function populateVenueDropdown() {
    const venueSelect = document.getElementById('venue');
    venueSelect.innerHTML = '<option value="">Select Venue</option>' +
        allVenues.map(v => `<option value="${v.venue}">${v.venue}</option>`).join('');
}

// Update Team2 options (exclude Team1)
function updateTeam2Options() {
    const team1 = document.getElementById('team1').value;
    const team2Select = document.getElementById('team2');

    const options = allTeams
        .filter(team => team !== team1)
        .map(team => `<option value="${team}">${team}</option>`).join('');

    team2Select.innerHTML = '<option value="">Select Team 2</option>' + options;

    // Clear toss winner if it was team1
    const tossSelect = document.getElementById('toss_winner');
    if (tossSelect.value === team1) {
        tossSelect.value = '';
    }
}

// Update toss winner options (only Team1 and Team2)
function updateTossOptions() {
    const team1 = document.getElementById('team1').value;
    const team2 = document.getElementById('team2').value;
    const tossSelect = document.getElementById('toss_winner');

    let options = '<option value="">Select Toss Winner</option>';

    if (team1) {
        options += `<option value="${team1}">${team1}</option>`;
    }
    if (team2) {
        options += `<option value="${team2}">${team2}</option>`;
    }

    // Preserve selection if still valid
    const currentValue = tossSelect.value;
    tossSelect.innerHTML = options;
    if (currentValue === team1 || currentValue === team2) {
        tossSelect.value = currentValue;
    }
}

// Update city based on venue selection
function updateCity() {
    const venue = document.getElementById('venue').value;
    const cityInput = document.getElementById('city');

    if (!venue) {
        cityInput.value = '';
        return;
    }

    // Find city from allVenues
    const venueData = allVenues.find(v => v.venue === venue);
    if (venueData) {
        cityInput.value = venueData.city;
    } else {
        // Fallback: fetch from API
        fetch(`/api/city?venue=${encodeURIComponent(venue)}`)
            .then(response => response.json())
            .then(data => {
                cityInput.value = data.city;
            })
            .catch(error => {
                console.error('Error fetching city:', error);
                cityInput.value = 'Unknown';
            });
    }
}

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Pre-match prediction
function predictPrematch() {
    const team1 = document.getElementById('team1').value;
    const team2 = document.getElementById('team2').value;
    const tossWinner = document.getElementById('toss_winner').value;
    const tossDecision = document.getElementById('toss_decision').value;
    const venue = document.getElementById('venue').value;
    const city = document.getElementById('city').value;

    // Validation
    if (!team1 || !team2 || !tossWinner || !venue) {
        alert('Please fill in all fields');
        return;
    }

    const data = {
        team1: team1,
        team2: team2,
        toss_winner: tossWinner,
        toss_decision: tossDecision,
        venue: venue,
        city: city
    };

    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        // Display result
        document.getElementById('prematch-winner').textContent = result.winner;
        document.getElementById('team1-prob').textContent = result.team1_prob;
        document.getElementById('team2-prob').textContent = result.team2_prob;
        document.getElementById('prematch-accuracy').textContent = result.model_accuracy;

        document.getElementById('prematch-result').classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to get prediction');
    });
}

// Live prediction
function predictLive() {
    const team1 = document.getElementById('live-team1').value;
    const team2 = document.getElementById('live-team2').value;
    const runsScored = parseInt(document.getElementById('runs_scored').value) || 0;
    const ballsBowled = parseInt(document.getElementById('balls_bowled').value) || 0;
    const wicketsFallen = parseInt(document.getElementById('wickets_fallen').value) || 0;
    const target = parseInt(document.getElementById('target').value) || 0;

    // Validation
    if (!team1 || !team2) {
        alert('Please select both teams');
        return;
    }

    if (ballsBowled > 120) {
        alert('Balls bowled cannot exceed 120 (20 overs)');
        return;
    }

    if (wicketsFallen > 10) {
        alert('Wickets cannot exceed 10');
        return;
    }

    if (runsScored >= target) {
        alert('Chasing team has already won!');
        return;
    }

    const data = {
        team1: team1,
        team2: team2,
        runs_scored: runsScored,
        balls_bowled: ballsBowled,
        wickets_fallen: wicketsFallen,
        target: target
    };

    fetch('/predict_live', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        // Display result
        document.getElementById('live-status').textContent = result.status_snapshot;
        document.getElementById('chasing-prob').textContent = result.chasing_team_win_prob;
        document.getElementById('defending-prob').textContent = result.defending_team_win_prob;
        document.getElementById('live-accuracy').textContent = result.model_accuracy;

        document.getElementById('live-result').classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to get prediction');
    });
}
