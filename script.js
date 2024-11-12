const channelId = '2696895';
const readApiKey = 'VTICFT6M5B9JJW0L';
const writeApiKey = 'QW797Z0YCTEX3IWG';

const apiUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=10`;

const speedField = 1;  // Angle
const voltageField = 3; // Current Position
const angleField = 2;   // Target Position

async function fetchThingSpeakData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feeds = data.feeds;

        const latestFeed = feeds[feeds.length - 1];

        document.getElementById('speedValue').innerText = latestFeed[`field${speedField}`] || 'No data';
        document.getElementById('voltageValue').innerText = latestFeed[`field${voltageField}`] || 'No data';
        document.getElementById('angleValue').innerText = latestFeed[`field${angleField}`] || 'No data';

        const timeStamps = feeds.map(feed => new Date(feed.created_at).toLocaleTimeString());
        const speedData = feeds.map(feed => feed[`field${speedField}`] || null);
        const voltageData = feeds.map(feed => feed[`field${voltageField}`] || null);
        const angleData = feeds.map(feed => feed[`field${angleField}`] || null);

        updateChart(speedChart, timeStamps, speedData);
        updateChart(voltageChart, timeStamps, voltageData);
        updateChart(angleChart, timeStamps, angleData);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function updateChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

const speedChart = new Chart(document.getElementById('speedChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Angle (Degrees)',
            borderColor: 'rgb(255, 99, 132)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Angle (Degrees)' }}
        }
    }
});

const voltageChart = new Chart(document.getElementById('voltageChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Current Position',
            borderColor: 'rgb(54, 162, 235)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Current Position' }}
        }
    }
});

const angleChart = new Chart(document.getElementById('angleChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Target Position',
            borderColor: 'rgb(75, 192, 192)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Target Position' }}
        }
    }
});

function sendAngle() {
    const angle = document.getElementById('angleInput').value;
    if (!angle || isNaN(angle)) {
        alert("Please enter a valid angle.");
        return;
    }

    const writeApiUrl = `https://api.thingspeak.com/update?api_key=${writeApiKey}&field2=${encodeURIComponent(angle)}`;

    fetch(writeApiUrl, {
        method: 'GET'
    })
    .then(response => {
        if (response.ok) {
            alert('Angle set successfully on ThingSpeak as Target Position');
        } else {
            alert('Failed to set angle on ThingSpeak');
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Failed to connect to ThingSpeak.");
    });
}

// Fetch data every 2 seconds
setInterval(() => {
    fetchThingSpeakData();
}, 2000);

// Initial call to load data
fetchThingSpeakData();
