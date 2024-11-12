const channelId = '2696895';
const apiKey = 'VTICFT6M5B9JJW0L';

const apiUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=10`;

const speedField = 1; // Replace with the correct field number for speed
const voltageField = 2; // Replace with the correct field number for voltage
const angleField = 3; // Replace with the correct field number for current angle

// Fetch ThingSpeak data
async function fetchThingSpeakData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feeds = data.feeds;

        // Update latest values
        const latestFeed = feeds[feeds.length - 1];
        document.getElementById('speedValue').textContent = latestFeed[`field${speedField}`];
        document.getElementById('voltageValue').textContent = latestFeed[`field${voltageField}`];
        document.getElementById('angleValue').textContent = latestFeed[`field${angleField}`];

        // Prepare data for charts
        const timeStamps = feeds.map(feed => feed.created_at);
        const speedData = feeds.map(feed => feed[`field${speedField}`]);
        const voltageData = feeds.map(feed => feed[`field${voltageField}`]);
        const angleData = feeds.map(feed => feed[`field${angleField}`]);

        updateChart(speedChart, timeStamps, speedData);
        updateChart(voltageChart, timeStamps, voltageData);
        updateChart(angleChart, timeStamps, angleData);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Update the charts with new data
function updateChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Create charts
const speedChart = new Chart(document.getElementById('speedChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Speed (RPM)',
            borderColor: 'rgb(255, 99, 132)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Speed (RPM)' }}
        }
    }
});

const voltageChart = new Chart(document.getElementById('voltageChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Voltage (V)',
            borderColor: 'rgb(54, 162, 235)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Voltage (V)' }}
        }
    }
});

const angleChart = new Chart(document.getElementById('angleChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Current Angle (Degrees)',
            borderColor: 'rgb(75, 192, 192)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Current Angle (Degrees)' }}
        }
    }
});

// Fetch data every 15 seconds
setInterval(fetchThingSpeakData, 15000);
fetchThingSpeakData(); // Initial call to load data
