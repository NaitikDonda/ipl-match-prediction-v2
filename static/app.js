// IPL Match Predictor - Enhanced Frontend JavaScript

let allTeams = [];
let allVenues = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadTeams();
    loadVenues();
});

// Load real stats from API
function loadStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            // Update stats bar with real values
            document.querySelector('.stat-value').textContent = data.team_count;
            document.querySelectorAll('.stat-value')[1].textContent = data.venue_count + '+';
            document.querySelectorAll('.stat-value')[2].textContent = data.prematch_accuracy + '%';
        })
        .catch(error => console.error('Error loading stats:', error));
}

// API Base URL - change this to your deployed URL
const BASE_URL = 'https://ipl-match-prediction-v2-1.onrender.com';

// Load teams from API
function loadTeams() {
    fetch(`${BASE_URL}/api/teams`)
        .then(response => response.json())
        .then(data => {
            allTeams = data.teams;
            populateTeamDropdowns();
        })
        .catch(error => console.error('Error loading teams:', error));
}

// Load venues from API
function loadVenues() {
    fetch(`${BASE_URL}/api/venues`)
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

    const options = allTeams.map(team => `<option value="${team}">${team}</option>`).join('');

    team1Select.innerHTML = '<option value="">Select Team 1</option>' + options;
    team2Select.innerHTML = '<option value="">Select Team 2</option>' + options;
    tossSelect.innerHTML = '<option value="">Select Toss Winner</option>';

    // Create live options and populate live team dropdowns
    const liveOptions = '<option value="">Select Team</option>' + options;
    liveTeam1Select.innerHTML = liveOptions;
    liveTeam2Select.innerHTML = liveOptions;
    
    // Add change handlers for live team validation
    liveTeam1Select.onchange = function() {
        updateLiveTeamOptions('live-team1', 'live-team2');
    };
    liveTeam2Select.onchange = function() {
        updateLiveTeamOptions('live-team2', 'live-team1');
    };
}

// Update live team options to prevent same team selection
function updateLiveTeamOptions(changedId, otherId) {
    const changedTeam = document.getElementById(changedId).value;
    const otherSelect = document.getElementById(otherId);
    const otherTeam = otherSelect.value;
    
    // If same team selected, clear the other one
    if (changedTeam && changedTeam === otherTeam) {
        otherSelect.value = '';
        alert('Please select different teams for chasing and defending');
    }
}

// Show venue autocomplete suggestions
function showVenueSuggestions() {
    const input = document.getElementById('venue-input');
    const suggestionsList = document.getElementById('venue-suggestions');
    const searchText = input.value.toLowerCase().trim();
    
    if (!searchText) {
        suggestionsList.classList.add('hidden');
        return;
    }
    
    // Filter venues by name or city
    const filtered = allVenues.filter(v => 
        v.venue.toLowerCase().includes(searchText) || 
        v.city.toLowerCase().includes(searchText)
    );
    
    // Auto-select if exact match
    const exactMatch = allVenues.find(v => v.venue.toLowerCase() === searchText);
    if (exactMatch) {
        selectVenue(exactMatch.venue, exactMatch.city);
        return;
    }
    
    if (filtered.length === 0) {
        suggestionsList.innerHTML = '<div class="no-suggestions">No stadiums found</div>';
    } else {
        suggestionsList.innerHTML = filtered.map(v => `
            <div class="suggestion-item" onclick="selectVenue('${v.venue}', '${v.city}')">
                <div class="suggestion-stadium">${v.venue}</div>
                <div class="suggestion-city">${v.city}</div>
            </div>
        `).join('');
    }
    
    suggestionsList.classList.remove('hidden');
}

// Select venue from suggestion
function selectVenue(venue, city) {
    document.getElementById('venue-input').value = venue;
    document.getElementById('venue').value = venue;
    document.getElementById('city').value = city;
    document.getElementById('venue-suggestions').classList.add('hidden');
}

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.autocomplete-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const suggestions = document.getElementById('venue-suggestions');
        if (suggestions) suggestions.classList.add('hidden');
    }
});

// Update Team2 options (exclude Team1)
function updateTeam2Options() {
    const team1 = document.getElementById('team1').value;
    const team2Select = document.getElementById('team2');

    const options = allTeams
        .filter(team => team !== team1)
        .map(team => `<option value="${team}">${team}</option>`).join('');

    const currentTeam2 = team2Select.value;
    team2Select.innerHTML = '<option value="">Select Team 2</option>' + options;

    // Restore selection if still valid
    if (currentTeam2 && currentTeam2 !== team1) {
        team2Select.value = currentTeam2;
    }

    updateTossOptions();
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
        cityInput.value = 'Unknown';
    }
}

// Adjust number input value
function adjustValue(inputId, delta) {
    const input = document.getElementById(inputId);
    const currentValue = parseInt(input.value) || 0;
    const min = parseInt(input.min) || 0;
    const max = parseInt(input.max) || 999;

    let newValue = currentValue + delta;
    newValue = Math.max(min, Math.min(max, newValue));

    input.value = newValue;
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
    event.currentTarget.classList.add('active');
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

    // Prevent same team selection
    if (team1 === team2) {
        alert('Team 1 and Team 2 cannot be the same!');
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

    // Show loading state
    const btn = document.querySelector('.predict-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Predicting...';
    btn.disabled = true;

    fetch(`${BASE_URL}/predict`, {
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
        document.getElementById('team1-prob').textContent = result.team1_prob + '%';
        document.getElementById('team2-prob').textContent = result.team2_prob + '%';
        document.getElementById('prematch-accuracy').textContent = result.model_accuracy;

        // Animate progress bars
        setTimeout(() => {
            document.getElementById('team1-bar').style.width = result.team1_prob + '%';
            document.getElementById('team2-bar').style.width = result.team2_prob + '%';
        }, 100);

        // Show result
        const resultContainer = document.getElementById('prematch-result');
        resultContainer.classList.remove('hidden');

        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to get prediction');
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
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

    // Prevent same team selection
    if (team1 === team2) {
        alert('Chasing and Defending teams cannot be the same!');
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

    // Show loading state
    const btn = document.querySelector('.live-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Calculating...';
    btn.disabled = true;

    fetch(`${BASE_URL}/predict_live`, {
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

        // Calculate match statistics
        const runsNeeded = target - runsScored;
        const ballsRemaining = 120 - ballsBowled;
        const oversCompleted = (ballsBowled / 6).toFixed(1);
        const runRate = ballsBowled > 0 ? (runsScored / (ballsBowled / 6)).toFixed(2) : '0.00';
        const reqRate = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : '0.00';

        // Update live status bar
        document.getElementById('live-score').textContent = `${runsScored}/${wicketsFallen}`;
        document.getElementById('live-overs').textContent = oversCompleted;
        document.getElementById('runs-needed').textContent = runsNeeded;
        document.getElementById('run-rate').textContent = runRate;
        document.getElementById('req-rate').textContent = reqRate;

        // Update probability text and bars
        document.getElementById('chasing-prob-text').textContent = result.chasing_team_win_prob + '%';
        document.getElementById('defending-prob-text').textContent = result.defending_team_win_prob + '%';
        document.getElementById('live-accuracy').textContent = result.model_accuracy;

        // Animate progress bars
        setTimeout(() => {
            document.getElementById('chasing-bar').style.width = result.chasing_team_win_prob + '%';
            document.getElementById('defending-bar').style.width = result.defending_team_win_prob + '%';
        }, 100);

        // Generate match insight
        const chasingProb = parseFloat(result.chasing_team_win_prob);
        const insightText = generateMatchInsight(runsScored, ballsBowled, wicketsFallen, target, runsNeeded, reqRate, chasingProb);
        document.getElementById('match-situation-text').textContent = insightText;

        // Show result
        const resultContainer = document.getElementById('live-result');
        resultContainer.classList.remove('hidden');

        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to get prediction');
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// Generate match insight based on situation
function generateMatchInsight(runs, balls, wickets, target, need, reqRR, winProb) {
    const overs = (balls / 6).toFixed(1);
    
    if (winProb > 70) {
        return `Chasing team is in a strong position! Need ${need} runs from ${120 - balls} balls.`;
    } else if (winProb < 30) {
        return `Defending team has the upper hand. Chasing team needs ${need} runs at ${reqRR} RPO.`;
    } else if (wickets >= 7) {
        return `Tight situation! Only ${10 - wickets} wickets remaining, need ${reqRR} runs per over.`;
    } else if (balls > 100) {
        return `Match is evenly poised with ${need} runs needed from ${120 - balls} balls.`;
    } else {
        return `Close contest! Required run rate is ${reqRR}, chasing team has ${winProb}% win probability.`;
    }
}

// Update live input hints
function updateLiveHints() {
    const runs = parseInt(document.getElementById('runs_scored').value) || 0;
    const balls = parseInt(document.getElementById('balls_bowled').value) || 0;
    const wickets = parseInt(document.getElementById('wickets_fallen').value) || 0;
    
    // Update overs display
    const overs = (balls / 6).toFixed(1);
    document.getElementById('overs-display').textContent = `${overs} overs`;
    
    // Update wickets remaining
    const remaining = Math.max(0, 10 - wickets);
    document.getElementById('wickets-remaining').textContent = `${remaining} wicket${remaining !== 1 ? 's' : ''} remaining`;
}

// Add event listeners for live inputs
['runs_scored', 'balls_bowled', 'wickets_fallen', 'target'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', updateLiveHints);
    }
});
