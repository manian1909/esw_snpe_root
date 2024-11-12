const channelId = '2696895';
const readApiKey = 'VTICFT6M5B9JJW0L';
const writeApiKey = 'QW797Z0YCTEX3IWG'; // Replace with your ThingSpeak Write API Key

const apiUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=10`;

const speedField = 1;
const voltageField = 3;
const angleField = 2;

async function fetchThingSpeakData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feeds = data.feeds;

        console.log(feeds);

        const latestFeed = feeds[feeds.length - 1];
        console.log(latestFeed);

        // Update the latest values on the UI
        document.getElementById('speedValue').innerText = latestFeed[`field${speedField}`] || 'No data';
        document.getElementById('voltageValue').innerText = latestFeed[`field${voltageField}`] || 'No data';
        document.getElementById('angleValue').innerText = latestFeed[`field${angleField}`] || 'No data';

        // Prepare data for the charts
        const timeStamps = feeds.map(feed => new Date(feed.created_at).toLocaleTimeString());
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
            label: 'Target Position',
            borderColor: 'rgb(54, 162, 235)',
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

const angleChart = new Chart(document.getElementById('angleChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Current Position',
            borderColor: 'rgb(75, 192, 192)',
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

function sendAngle() {
    const angle = document.getElementById('angleInput').value;
    if (!angle || isNaN(angle)) {
        alert("Please enter a valid angle.");
        return;
    }

    // Construct the ThingSpeak write API URL with the angle as a parameter for field2
    const writeApiUrl = `https://api.thingspeak.com/update?api_key=${writeApiKey}&field2=${encodeURIComponent(angle)}`;

    // Send the angle to ThingSpeak
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
